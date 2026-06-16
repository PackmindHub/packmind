import { UserId } from '../../accounts/User';
import { SystemEvent } from '../../events';
import { MarketplaceId } from '../MarketplaceId';
import { PluginInstallScope } from '../PluginInstallation';

/**
 * Emitted by `TrackPluginInstallHeartbeatUseCase` on **first-seen** creation
 * of a `PluginInstallation` row.
 *
 * The endpoint is public (no mandatory Packmind auth), so `userId` is optional:
 * it is set only when the API-key JWT was verified against the marketplace's org.
 * Amplitude uses `userId` when present, `anonymousIdHash` otherwise.
 */
export interface PluginInstallTrackedPayload {
  organizationId: string;
  marketplaceId: MarketplaceId;
  /** Best-effort resolved Packmind package id (`null` when slug is unknown). */
  packageId?: string | null;
  pluginSlug: string;
  scope: PluginInstallScope;
  /** Verified Packmind user id (set only when API-key JWT was valid + org-matched). */
  userId?: UserId | null;
  /** SHA-256 hash of the lowercased Claude account email (anonymous identity). */
  anonymousIdHash?: string | null;
}

export class PluginInstallTrackedEvent extends SystemEvent<PluginInstallTrackedPayload> {
  static override readonly eventName = 'deployments.plugin.install-tracked';
}
