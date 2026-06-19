import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createMarketplaceDistributionId,
  DistributionStatus,
  GitProviderTokenInvalidError,
  GitProviderWithoutToken,
  GitRepo,
  IAccountsPort,
  IGitPort,
  IPublishPackageOnMarketplaceUseCase,
  ISpacesPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceDescriptorBadFormatError,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDistribution,
  MarketplaceNotFoundError,
  MarketplacePluginNameConflictError,
  OrganizationId,
  PackmindMarketplaceLock,
  PluginPublishAttemptedEvent,
  PluginRef,
  PublishPackageOnMarketplaceCommand,
  PublishPackageOnMarketplaceResponse,
  UserId,
} from '@packmind/types';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { PackageService } from '../../services/PackageService';
import { MarketplaceDescriptorParserRegistry } from '../../services/MarketplaceDescriptorParserRegistry';
import { fetchMarketplaceDescriptorFile } from '../../services/fetchMarketplaceDescriptorFile';
import { fetchPackmindMarketplaceLock } from '../../services/packmindMarketplaceLock';
import { resolveMarketplaceReadBranch } from '../../services/resolveMarketplaceReadBranch';
import { PublishPluginToMarketplaceDelayedJob } from '../../jobs/PublishPluginToMarketplaceDelayedJob';

const origin = 'PublishPackageOnMarketplaceUseCase';

/**
 * Publishes a Packmind package as a managed plugin on a linked marketplace.
 *
 * Member-scoped: any org member can trigger a publish. The use case is the
 * synchronous slice of the publish pipeline — it validates the request,
 * persists an `in_progress` `MarketplaceDistribution` row, enqueues the BullMQ
 * job that owns the Git side effects, and emits
 * `PluginPublishAttemptedEvent`.
 *
 * Failure surfaces synchronously to the caller:
 *  - `MarketplaceNotFoundError` — unknown marketplace or wrong org.
 *  - `PackageNotFoundError` — unknown package or wrong org.
 *  - `GitProviderTokenInvalidError` — preflight rejected by the git provider.
 *  - `MarketplaceDescriptorNotFoundError` / `MarketplaceDescriptorBadFormatError`
 *    — descriptor missing or unparseable; the marketplace state is moved to
 *    `bad_format` for admin visibility.
 *  - `MarketplacePluginNameConflictError` — unmanaged plugin on the marketplace
 *    already exposes the same slug.
 */
export class PublishPackageOnMarketplaceUseCase
  extends AbstractMemberUseCase<
    PublishPackageOnMarketplaceCommand,
    PublishPackageOnMarketplaceResponse
  >
  implements IPublishPackageOnMarketplaceUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly packageService: PackageService,
    private readonly spacesPort: ISpacesPort,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly publishJob: PublishPluginToMarketplaceDelayedJob,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: PublishPackageOnMarketplaceCommand & MemberContext,
  ): Promise<PublishPackageOnMarketplaceResponse> {
    const { marketplaceId, packageId, organization } = command;

    this.logger.info('Publish package on marketplace requested', {
      organizationId: organization.id,
      marketplaceId,
      packageId,
    });

    // 1. Resolve the marketplace (org-scoped).
    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    // 2. Resolve the package and confirm it belongs to the org via its space.
    const pkg = await this.packageService.findById(packageId);
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }
    const pkgSpace = await this.spacesPort.getSpaceById(pkg.spaceId);
    if (!pkgSpace || pkgSpace.organizationId !== organization.id) {
      throw new PackageNotFoundError(packageId);
    }

    // 3. Resolve the marketplace's git repo + git provider; preflight the token.
    const marketplaceGitRepo =
      await this.gitPort.findMarketplaceGitRepoById(
        marketplace.gitRepoId,
      );
    if (!marketplaceGitRepo) {
      this.logger.error('Marketplace git repo missing on publish', {
        marketplaceId,
        gitRepoId: marketplace.gitRepoId,
      });
      throw new GitProviderTokenInvalidError();
    }
    await this.preflightGitToken({
      provisionalGitRepo: marketplaceGitRepo,
      userId: command.user.id,
      organizationId: organization.id,
    });

    // 4. Resolve which branch to read descriptor + lock from. When the
    //    rolling `packmind/sync` branch already exists from an earlier
    //    publish, that branch is the canonical Packmind-managed state and
    //    must be the source for the name-collision preflight; otherwise we
    //    fall back to the marketplace's default branch.
    const readBranch = await resolveMarketplaceReadBranch(
      this.gitPort,
      marketplaceGitRepo,
    );

    // 4a. Fetch the descriptor and parse it.
    const descriptor = await this.loadDescriptor({
      marketplace,
      marketplaceGitRepo,
      readBranch,
    });

    // 4b. Fetch the standalone Packmind lock file. A missing file is the
    //     normal first-publish path (empty lock); a malformed file means
    //     the marketplace is unhealthy and is treated as bad_format.
    const lock = await this.loadLock({
      marketplace,
      marketplaceGitRepo,
      readBranch,
    });

    // 5. Reject name collisions against unmanaged plugin entries.
    const pluginSlug = pkg.slug;
    this.assertNoUnmanagedNameCollision({
      pluginSlug,
      marketplace,
      descriptor,
      lock,
    });

    // 6. Compute the "first publish" flag for analytics.
    const previousDistribution =
      await this.marketplaceDistributionRepository.findLatestByPackageAndMarketplace(
        packageId,
        marketplaceId,
      );
    const isFirstPublishForPackage = previousDistribution === null;

    // 7. Create the in-progress distribution row.
    const marketplaceDistributionId = createMarketplaceDistributionId(uuidv4());
    const distribution: MarketplaceDistribution = {
      id: marketplaceDistributionId,
      organizationId: organization.id,
      marketplaceId,
      packageId,
      pluginSlug,
      authorId: command.user.id,
      status: DistributionStatus.in_progress,
      source: command.distributionSource ?? 'app',
    } as MarketplaceDistribution;
    await this.marketplaceDistributionRepository.add(distribution);

    // 8. Enqueue the BullMQ job that performs the Git side effects.
    try {
      await this.publishJob.addJob({
        marketplaceDistributionId,
        marketplaceId,
        packageId,
        organizationId: organization.id,
        userId: command.user.id,
      });
    } catch (error) {
      this.logger.error(
        'Failed to enqueue publish-plugin-to-marketplace job — marking distribution as failure',
        {
          marketplaceDistributionId,
          marketplaceId,
          packageId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }

    // 9. Emit the attempted event.
    this.eventEmitterService.emit(
      new PluginPublishAttemptedEvent({
        userId: command.user.id,
        organizationId: organization.id,
        source: command.source ?? 'ui',
        marketplaceDistributionId,
        marketplaceId,
        packageId,
        isFirstPublishForPackage,
      }),
    );

    return {
      marketplaceDistributionId,
      status: 'in_progress',
      marketplaceId,
      packageId,
      pluginSlug,
    };
  }

  private async preflightGitToken(params: {
    provisionalGitRepo: GitRepo;
    userId: UserId;
    organizationId: OrganizationId;
  }): Promise<void> {
    const { provisionalGitRepo, userId, organizationId } = params;

    try {
      const providersResponse = await this.gitPort.listProviders({
        userId,
        organizationId,
      });
      const provider: GitProviderWithoutToken | undefined =
        providersResponse.providers.find(
          (p) => p.id === provisionalGitRepo.providerId,
        );
      if (!provider || !provider.hasAuth) {
        this.logger.warn(
          'Git provider token preflight failed — provider missing or no auth',
          {
            providerId: provisionalGitRepo.providerId,
            hasProvider: !!provider,
            hasAuth: provider?.hasAuth ?? false,
          },
        );
        throw new GitProviderTokenInvalidError();
      }
    } catch (error) {
      if (error instanceof GitProviderTokenInvalidError) {
        throw error;
      }
      this.logger.warn(
        'Git provider token preflight failed with an underlying error',
        {
          providerId: provisionalGitRepo.providerId,
          // Intentionally not echoing token bytes — only the failure category.
          error: error instanceof Error ? error.name : 'unknown',
        },
      );
      throw new GitProviderTokenInvalidError();
    }
  }

  private async loadDescriptor(params: {
    marketplace: Marketplace;
    marketplaceGitRepo: GitRepo;
    readBranch: string;
  }): Promise<MarketplaceDescriptor> {
    const { marketplace, marketplaceGitRepo, readBranch } = params;
    let descriptorFile: Awaited<
      ReturnType<typeof fetchMarketplaceDescriptorFile>
    >;
    try {
      descriptorFile = await fetchMarketplaceDescriptorFile(
        this.gitPort,
        marketplaceGitRepo,
        readBranch,
      );
    } catch (error) {
      await this.markBadFormat(marketplace.id);
      throw new MarketplaceDescriptorBadFormatError(
        marketplaceGitRepo.owner,
        marketplaceGitRepo.repo,
        error instanceof Error ? error.message : String(error),
      );
    }

    if (!descriptorFile) {
      await this.markBadFormat(marketplace.id);
      throw new MarketplaceDescriptorNotFoundError(
        marketplaceGitRepo.owner,
        marketplaceGitRepo.repo,
      );
    }

    try {
      return this.parserRegistry.parse(descriptorFile.content);
    } catch (error) {
      await this.markBadFormat(marketplace.id);
      throw new MarketplaceDescriptorBadFormatError(
        marketplaceGitRepo.owner,
        marketplaceGitRepo.repo,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async loadLock(params: {
    marketplace: Marketplace;
    marketplaceGitRepo: GitRepo;
    readBranch: string;
  }): Promise<PackmindMarketplaceLock> {
    const { marketplace, marketplaceGitRepo, readBranch } = params;
    try {
      return await fetchPackmindMarketplaceLock(
        this.gitPort,
        marketplaceGitRepo,
        readBranch,
      );
    } catch (error) {
      await this.markBadFormat(marketplace.id);
      throw new MarketplaceDescriptorBadFormatError(
        marketplaceGitRepo.owner,
        marketplaceGitRepo.repo,
        `packmind-lock.json is unparseable on ${marketplaceGitRepo.owner}/${marketplaceGitRepo.repo}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async markBadFormat(marketplaceId: Marketplace['id']): Promise<void> {
    try {
      await this.marketplaceRepository.updateState(marketplaceId, {
        state: 'bad_format',
        lastValidatedAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to transition marketplace ${marketplaceId} to bad_format state`,
        {
          marketplaceId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  private assertNoUnmanagedNameCollision(params: {
    pluginSlug: string;
    marketplace: Marketplace;
    descriptor: MarketplaceDescriptor;
    lock: PackmindMarketplaceLock;
  }): void {
    const { pluginSlug, marketplace, descriptor, lock } = params;
    const managedSlugs = new Set<string>(Object.keys(lock.plugins));
    const collidingUnmanaged = descriptor.plugins.find(
      (p: PluginRef) => p.slug === pluginSlug && !managedSlugs.has(p.slug),
    );
    if (collidingUnmanaged) {
      // Filename is referenced in the broader error context so admins can
      // locate the conflicting entry inside `marketplace.json`.
      this.logger.warn(
        `Plugin "${pluginSlug}" collides with an unmanaged entry in ${MARKETPLACE_DESCRIPTOR_FILENAME}`,
        { marketplaceId: marketplace.id, pluginSlug },
      );
      throw new MarketplacePluginNameConflictError(
        pluginSlug,
        marketplace.name,
      );
    }
  }
}
