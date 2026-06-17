import { IPublicUseCase, PublicPackmindCommand } from '../../UseCase';
import { MarketplaceId } from '../MarketplaceId';
import { PluginInstallScope } from '../PluginInstallation';

/**
 * Command issued by the public tracking endpoint when a SessionStart hook
 * POSTs a heartbeat.
 *
 * The `trackingToken` header identifies the marketplace (not the caller).
 * Identity is established by:
 *  - `verifiedUserId` — set by the API layer after verifying the `Authorization`
 *    JWT against the token's org. The client NEVER self-claims a userId.
 *  - `anonymousIdHash` / `anonymousEmailMasked` — pseudonymous fallback derived
 *    client-side from the Claude account email (hash never hits the wire as raw email).
 */
export type TrackPluginInstallHeartbeatCommand = PublicPackmindCommand & {
  /** Org-scoped opaque token from the `X-Packmind-Tracking-Token` header. */
  trackingToken: string;
  /** Slug of the installed plugin (matches `MarketplaceDistribution.pluginSlug`). */
  pluginSlug: string;
  /** Name of the marketplace, used for deduplication logging only. */
  marketplaceName: string;
  scope: PluginInstallScope;
  /**
   * Version reported as installed, read from the installed plugin manifest by
   * the SessionStart hook. Omitted when the hook could not resolve a version.
   */
  installedVersion?: string | null;
  /** Raw git remote URL of the active project; omitted when no git remote. */
  repoRemoteUrl?: string | null;
  /** SHA-256 hash of lowercased Claude account email. */
  anonymousIdHash?: string | null;
  /** Masked display email, e.g. `b**.s***@acme.com`. */
  anonymousEmailMasked?: string | null;
  /**
   * Verified Packmind user id — resolved by the API layer from the
   * `Authorization` JWT. The use case enforces the cross-org guard by
   * comparing `verifiedUserOrgId` against the marketplace's organizationId;
   * never provided by the client directly.
   */
  verifiedUserId?: string | null;
  /**
   * Organization id extracted from the API key JWT — used by the use case to
   * enforce the cross-org guard (spec §7.3, §9):
   * "Cross-org API key → Ignore key, fall back to anonymous."
   * Null when no Authorization header is present or the key is invalid.
   */
  verifiedUserOrgId?: string | null;
};

export type TrackPluginInstallHeartbeatResponse = {
  /** `true` when a new installation row was created (first-seen), `false` on update. */
  created: boolean;
  marketplaceId: MarketplaceId;
};

export type ITrackPluginInstallHeartbeatUseCase = IPublicUseCase<
  TrackPluginInstallHeartbeatCommand,
  TrackPluginInstallHeartbeatResponse
>;
