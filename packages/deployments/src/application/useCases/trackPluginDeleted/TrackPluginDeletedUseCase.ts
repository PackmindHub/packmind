import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  OrganizationId,
  PackageWithArtefacts,
  PluginDeletedEvent,
  SpaceId,
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse,
} from '@packmind/types';
import { parsePackageSlug } from '../../services/packageSlugHelpers';
import { PackageService } from '../../services/PackageService';
import { PackagesNotFoundError } from '../../../domain/errors/PackagesNotFoundError';

const origin = 'TrackPluginDeletedUseCase';

/**
 * Emits a `PluginDeletedEvent` when a rendered plugin is removed.
 *
 * Plugin delete is a local-only operation; this use case resolves the package
 * to enrich the event and writes no distribution row.
 */
export class TrackPluginDeletedUseCase extends AbstractMemberUseCase<
  TrackPluginDeletedCommand,
  TrackPluginDeletedResponse
> {
  constructor(
    private readonly packageService: PackageService,
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('TrackPluginDeletedUseCase initialized');
  }

  protected async executeForMembers(
    command: TrackPluginDeletedCommand & MemberContext,
  ): Promise<TrackPluginDeletedResponse> {
    this.logger.info('Tracking plugin deletion', {
      organizationId: command.organizationId,
      packageSlug: command.packageSlug,
    });

    const pkg = await this.resolvePackageBySlug(
      command.packageSlug,
      command.organization.id,
    );

    const marketplaceRepo = command.gitRemoteUrl?.trim()
      ? command.gitRemoteUrl
      : undefined;

    try {
      this.eventEmitterService.emit(
        new PluginDeletedEvent({
          userId: command.user.id,
          organizationId: command.organization.id,
          source: command.source ?? 'cli',
          packageId: pkg.id,
          packageSlug: pkg.slug,
          ...(marketplaceRepo ? { marketplaceRepo } : {}),
        }),
      );
    } catch (error) {
      this.logger.warn('Failed to track plugin deletion; continuing', {
        error,
      });
    }

    return { tracked: true };
  }

  private async resolvePackageBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts> {
    const { spaceSlug, packageSlug } = parsePackageSlug(slug);

    const spaceId = await this.resolveSpaceId(spaceSlug, organizationId);
    if (!spaceId) {
      throw new PackagesNotFoundError([slug]);
    }

    const packages =
      await this.packageService.getPackagesBySlugsAndSpaceWithArtefacts(
        [packageSlug],
        spaceId,
      );

    const found = packages.find((p) => p.slug === packageSlug);
    if (!found) {
      throw new PackagesNotFoundError([slug]);
    }

    return found;
  }

  private async resolveSpaceId(
    spaceSlug: string | null,
    organizationId: OrganizationId,
  ): Promise<SpaceId | null> {
    if (spaceSlug === null) {
      const spaces =
        await this.spacesPort.listSpacesByOrganization(organizationId);
      return spaces.find((s) => s.isDefaultSpace)?.id ?? null;
    }

    const space = await this.spacesPort.getSpaceBySlug(
      spaceSlug,
      organizationId,
    );
    return space?.id ?? null;
  }
}
