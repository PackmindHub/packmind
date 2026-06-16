import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  MarketplaceId,
  OrganizationId,
  PluginInstallTrackedEvent,
  TrackPluginInstallHeartbeatCommand,
  TrackPluginInstallHeartbeatResponse,
  UserId,
  createPluginInstallationId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  IPluginInstallationRepository,
  IMarketplaceRepository,
} from '../../../domain/repositories';
import { parsePackageSlug } from '../../services/packageSlugHelpers';
import { PackageService } from '../../services/PackageService';

const origin = 'TrackPluginInstallHeartbeatUseCase';

/**
 * Resolves the packageId for a given pluginSlug by looking up packages across
 * the org. Returns `null` when no matching package is found — this is an
 * accepted outcome (spec §9: unknown slugs are accepted with packageId = null).
 */
async function resolvePackageId(
  pluginSlug: string,
  organizationId: OrganizationId,
  packageService: PackageService,
): Promise<string | null> {
  try {
    const { packageSlug } = parsePackageSlug(pluginSlug);
    const packages = await packageService.getPackagesBySlugsWithArtefacts(
      [packageSlug],
      organizationId,
    );
    const found = packages.find((p) => p.slug === packageSlug);
    return found ? (found.id as string) : null;
  } catch {
    return null;
  }
}

/**
 * Processes a SessionStart heartbeat from a published Packmind plugin.
 *
 * Authorization: the `trackingToken` is the sole credential — it identifies the
 * marketplace without requiring a user session. The API layer resolves the
 * verified userId before calling this use case.
 *
 * Spec §7.3 flow:
 * 1. Resolve marketplace + org from trackingToken.
 * 2. Resolve packageId best-effort from pluginSlug.
 * 3. Upsert the heartbeat row.
 * 4. Emit `PluginInstallTrackedEvent` ONLY when a row was CREATED (first-seen).
 */
export class TrackPluginInstallHeartbeatUseCase {
  private readonly logger: PackmindLogger;

  constructor(
    private readonly pluginInstallationRepository: IPluginInstallationRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly packageService: PackageService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    this.logger = logger;
    this.logger.info('TrackPluginInstallHeartbeatUseCase initialized');
  }

  async execute(
    command: TrackPluginInstallHeartbeatCommand,
  ): Promise<TrackPluginInstallHeartbeatResponse> {
    this.logger.info('Processing plugin install heartbeat', {
      pluginSlug: command.pluginSlug,
      scope: command.scope,
      marketplaceName: command.marketplaceName,
    });

    // 1. Resolve marketplace + org from tracking token
    const marketplace = await this.marketplaceRepository.findByTrackingToken(
      command.trackingToken,
    );
    if (!marketplace) {
      this.logger.warn('Invalid tracking token — no marketplace found', {
        tokenPrefix: command.trackingToken.substring(0, 6) + '*',
      });
      const err = new Error('Invalid tracking token');
      err.name = 'UnauthorizedError';
      throw err;
    }

    const marketplaceId = marketplace.id;
    const organizationId = marketplace.organizationId;

    // 2. Resolve verifiedUserId with cross-org guard (spec §7.3, §9):
    // "Cross-org API key → Ignore key, fall back to anonymous."
    // The API layer forwards both userId and orgId from the JWT; we only
    // attribute the heartbeat to the user when the API key belongs to the
    // same org as the marketplace's tracking token.
    const isVerifiedForOrg =
      command.verifiedUserId &&
      command.verifiedUserOrgId &&
      command.verifiedUserOrgId === (organizationId as string);
    const userId: UserId | null = isVerifiedForOrg
      ? createUserId(command.verifiedUserId!)
      : null;

    // 3. Resolve packageId best-effort from pluginSlug
    const packageId = await resolvePackageId(
      command.pluginSlug,
      organizationId,
      this.packageService,
    );

    // 4. Upsert heartbeat
    const { created, installation } =
      await this.pluginInstallationRepository.upsertHeartbeat({
        id: createPluginInstallationId(uuidv4()),
        organizationId: organizationId as string,
        marketplaceId,
        pluginSlug: command.pluginSlug,
        packageId,
        installedVersion: command.installedVersion ?? null,
        scope: command.scope,
        userId: userId ? (userId as string) : null,
        anonymousIdHash: command.anonymousIdHash ?? null,
        anonymousEmailMasked: command.anonymousEmailMasked ?? null,
        repoRemoteUrl: command.repoRemoteUrl ?? null,
        now: new Date(),
      });

    // 5. Emit event ONLY on first-seen (INSERT)
    if (created) {
      try {
        this.eventEmitterService.emit(
          new PluginInstallTrackedEvent({
            organizationId,
            marketplaceId,
            packageId,
            pluginSlug: command.pluginSlug,
            scope: command.scope,
            userId,
            anonymousIdHash: command.anonymousIdHash ?? null,
          }),
        );
      } catch (error) {
        this.logger.warn(
          'Failed to emit PluginInstallTrackedEvent; continuing',
          { error },
        );
      }
    }

    this.logger.info('Plugin install heartbeat processed', {
      pluginSlug: command.pluginSlug,
      marketplaceId,
      created,
      installationId: installation.id,
    });

    return { created, marketplaceId: marketplaceId as MarketplaceId };
  }
}
