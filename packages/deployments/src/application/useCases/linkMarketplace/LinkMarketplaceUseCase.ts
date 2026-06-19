import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createGitRepoId,
  createMarketplaceId,
  createUserId,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitRepo,
  GitRepoAlreadyLinkedAsStandardError,
  IAccountsPort,
  IGitPort,
  ILinkMarketplaceUseCase,
  LinkMarketplaceCommand,
  LinkMarketplaceResponse,
  Marketplace,
  MarketplaceAlreadyLinkedError,
  MarketplaceDescriptorNotFoundError,
  MarketplaceLinkedEvent,
  UserId,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { MarketplaceReconciliationDelayedJob } from '../../jobs/MarketplaceReconciliationDelayedJob';
import { fetchMarketplaceDescriptorFile } from '../../services/fetchMarketplaceDescriptorFile';
import { MarketplaceDescriptorParserRegistry } from '../../services/MarketplaceDescriptorParserRegistry';

const origin = 'LinkMarketplaceUseCase';

/**
 * Links a Git repository as a marketplace for the caller's organization.
 *
 * Admin-only; enforced at the `AbstractAdminUseCase` boundary so denial
 * surfaces as `OrganizationAdminRequiredError` (HTTP 403) regardless of the
 * controller layer.
 *
 * Flow:
 *  1. Resolve the `GitProvider` and validate it belongs to the org.
 *  2. Pre-flight collision check — a `type='standard'` row for the same
 *     coordinates rejects with `GitRepoAlreadyLinkedAsStandardError`; a
 *     non-soft-deleted `type='marketplace'` row rejects with
 *     `MarketplaceAlreadyLinkedError(owner, repo)`.
 *  3. Fetch `marketplace.json` via `IGitPort.getFileFromRepo`.
 *  4. Parse it through `MarketplaceDescriptorParserRegistry`.
 *  5. Create a `GitRepo` with `type='marketplace'`.
 *  6. Insert a `Marketplace` row carrying the descriptor + plugin count.
 *  7. Emit `MarketplaceLinkedEvent`.
 *  8. (Group K, task 11.3) Enqueue the reconciliation job.
 *  9. Return the marketplace enriched with `addedByUserName`.
 */
export class LinkMarketplaceUseCase
  extends AbstractAdminUseCase<LinkMarketplaceCommand, LinkMarketplaceResponse>
  implements ILinkMarketplaceUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly reconciliationJob: MarketplaceReconciliationDelayedJob,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: LinkMarketplaceCommand & AdminContext,
  ): Promise<LinkMarketplaceResponse> {
    const {
      gitProviderId,
      owner,
      repo,
      branch,
      name,
      userId,
      organization,
      source,
    } = command;

    if (!gitProviderId) {
      throw new Error('Git provider ID is required');
    }
    if (!owner || !repo || !branch) {
      throw new Error('Owner, repository name, and branch are all required');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Marketplace name is required');
    }

    // 1. Resolve the provider and validate org match.
    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId: organization.id,
    });
    const gitProvider = providersResponse.providers.find(
      (p) => p.id === gitProviderId,
    );
    if (!gitProvider) {
      this.logger.error('Git provider not found', {
        gitProviderId,
        organizationId: organization.id,
        userId,
      });
      throw new GitProviderNotFoundError(gitProviderId);
    }
    if (gitProvider.organizationId !== organization.id) {
      this.logger.error('Git provider does not belong to organization', {
        gitProviderId,
        providerOrganizationId: gitProvider.organizationId,
        requestedOrganizationId: organization.id,
        userId,
      });
      throw new GitProviderOrganizationMismatchError(
        gitProviderId,
        organization.id,
      );
    }
    if (!gitProvider.hasAuth) {
      this.logger.error('Git provider has no token configured', {
        gitProviderId,
        organizationId: organization.id,
        userId,
      });
      throw new GitProviderMissingTokenError(gitProviderId);
    }

    // 2. Cross-type collision check (standard ↔ marketplace), scoped to the
    //    target provider so the same owner/repo on a different provider in the
    //    org (e.g. a GitHub vs GitLab `acme/plugins`) is not a false collision.
    const existingRepo = await this.gitPort.findGitRepoIgnoringType(
      organization.id,
      owner,
      repo,
      { providerId: gitProviderId },
    );
    if (existingRepo) {
      if (existingRepo.type === 'standard') {
        this.logger.error(
          'Cannot link marketplace — repo already linked as standard',
          {
            owner,
            repo,
            organizationId: organization.id,
            gitRepoId: existingRepo.id,
          },
        );
        throw new GitRepoAlreadyLinkedAsStandardError(owner, repo);
      }
      if (existingRepo.type === 'marketplace') {
        // Active (non-soft-deleted) marketplace row exists for these
        // coordinates. The default finder excludes soft-deleted rows, so
        // reaching here means there is a live one.
        this.logger.error('Marketplace already linked', {
          owner,
          repo,
          organizationId: organization.id,
          gitRepoId: existingRepo.id,
        });
        throw new MarketplaceAlreadyLinkedError(owner, repo);
      }
    }

    // Build the GitRepo we're about to fetch from (not yet persisted).
    const provisionalGitRepo: GitRepo = {
      id: createGitRepoId(uuidv4()),
      owner,
      repo,
      branch,
      providerId: gitProviderId,
      type: 'marketplace',
    };

    // 3. Fetch the marketplace descriptor, probing the official
    //    `.claude-plugin/marketplace.json` path first and falling back to a
    //    bare root `marketplace.json`.
    const file = await fetchMarketplaceDescriptorFile(
      this.gitPort,
      provisionalGitRepo,
      branch,
    );
    if (!file) {
      this.logger.warn('Marketplace descriptor not found', {
        owner,
        repo,
        branch,
      });
      throw new MarketplaceDescriptorNotFoundError(owner, repo);
    }

    // 4. Parse descriptor via the vendor-agnostic registry.
    const descriptor = this.parserRegistry.parse(file.content);

    // 5. Persist the marketplace-typed GitRepo.
    const createdGitRepo = await this.gitPort.addMarketplaceGitRepo({
      owner,
      repo,
      branch,
      providerId: gitProviderId,
      type: 'marketplace',
    });

    // 6. Insert the Marketplace row carrying the descriptor + plugin count.
    //    `createdAt`/`updatedAt`/`deletedAt`/`deletedBy` are populated by the
    //    DB via column defaults/triggers — TypeORM hydrates them on the
    //    returned row.
    const addedBy = createUserId(userId);
    const linkedAt = new Date();
    const marketplaceEntity = {
      id: createMarketplaceId(uuidv4()),
      organizationId: organization.id,
      gitRepoId: createdGitRepo.id,
      name: name.trim(),
      vendor: descriptor.vendor,
      addedBy,
      linkedAt,
      state: 'healthy' as const,
      lastValidatedAt: null,
      descriptor,
      pluginCount: descriptor.plugins.length,
      errorKind: null,
      errorDetail: null,
      pendingPrUrl: null,
      outdatedPluginSlugs: null,
      // Generate a fresh tracking token so new marketplaces always have a
      // non-null token from creation time (spec §7.2).
      trackingToken: uuidv4(),
    } as Marketplace;
    const insertedMarketplace =
      await this.marketplaceRepository.add(marketplaceEntity);

    // 7. Emit MarketplaceLinkedEvent.
    this.eventEmitterService.emit(
      new MarketplaceLinkedEvent({
        userId: addedBy,
        organizationId: organization.id,
        marketplaceId: insertedMarketplace.id,
        gitRepoId: createdGitRepo.id,
        addedBy,
        source: source ?? 'ui',
      }),
    );

    // 8. Schedule the BullMQ reconciliation cron + seed an immediate
    //    health-check so the marketplace's state column reflects the world as
    //    early as possible. Schedule failures are swallowed and logged — they
    //    must not break the link transaction.
    try {
      await this.reconciliationJob.scheduleRecurring(insertedMarketplace.id);
      await this.reconciliationJob.addJob({
        marketplaceId: insertedMarketplace.id,
      });
    } catch (error) {
      this.logger.error(
        'Failed to enqueue marketplace reconciliation job — marketplace state will not auto-refresh until the next manual trigger',
        {
          marketplaceId: insertedMarketplace.id,
          organizationId: organization.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // 9. Hydrate addedByUserName for the presentation DTO.
    const addedByUserName = await this.resolveAddedByUserName(addedBy);

    return {
      ...insertedMarketplace,
      addedByUserName,
    };
  }

  private async resolveAddedByUserName(userId: UserId): Promise<string> {
    const user = await this.accountsPort.getUserById(userId);
    if (!user) {
      return '';
    }
    return user.displayName ?? user.email;
  }
}
