import type {
  DistributionStatus,
  GitProviderId,
  GitRepoId,
  MarketplaceDistributionStatus,
  MarketplaceId,
  PackageId,
  CommandId,
  SkillId,
  StandardId,
  TargetId,
} from '@packmind/types';

export type ArtifactKind = 'standard' | 'command' | 'skill';

export type ArtifactId = StandardId | CommandId | SkillId;

export type RepoRef = {
  id: GitRepoId;
  owner: string;
  name: string;
  providerId: GitProviderId;
};

export type TargetRef = {
  id: TargetId;
  name: string;
  /** True when the target points at the repo root and the UI should hide the chip. */
  isDefault?: boolean;
};

/**
 * Why an install row is flagged as drifting:
 * - `behind`: the install has an older artifact version than Packmind exposes.
 * - `needs-removal`: the artifact was soft-deleted on Packmind but still lives on the repo.
 * - `not-distributed`: the artifact was added to the package but never pushed to this install.
 */
export type InstallDriftReason = 'behind' | 'needs-removal' | 'not-distributed';

export type RepoInstall = {
  repo: RepoRef;
  target: TargetRef;
  branch: string;
  deployedVersion: number;
  lastDeployedAt: string;
  driftReason: InstallDriftReason | 'aligned';
};

export type ArtifactDrift = {
  id: ArtifactId;
  kind: ArtifactKind;
  name: string;
  packmindVersion: number;
  isDeleted: boolean;
  isPending: boolean;
  installs: RepoInstall[];
};

export type InstallLocation = {
  repo: RepoRef;
  target: TargetRef;
  branch: string;
  lastDistributionStatus: DistributionStatus | null;
  lastDistributedAt: string | null;
};

export type PackageDrift = {
  id: PackageId;
  name: string;
  description: string;
  artifacts: ArtifactDrift[];
  installLocations: InstallLocation[];
};

/**
 * Target view scoped to a single (repo, target) pair. Each `PackageDrift`
 * inside `packages` has its `installLocations` and `artifact.installs`
 * restricted to this exact (repo, target) so the existing package-scoped
 * selectors and components keep working.
 */
export type TargetDrift = {
  id: TargetId;
  target: TargetRef;
  packages: PackageDrift[];
};

/**
 * Repo-centric pivot of the deployments overview: one entry per git repo,
 * with its targets, and inside each target the scoped packages.
 */
export type RepositoryDrift = {
  id: GitRepoId;
  repo: RepoRef;
  branch: string;
  targets: TargetDrift[];
};

/**
 * One outdated plugin inside a marketplace drift group: a plugin published from
 * a space-owned package whose source has changed since publish, so the
 * marketplace copy needs republishing.
 */
export type MarketplacePluginDrift = {
  pluginSlug: string;
  packageId: PackageId;
  packageName: string;
  /**
   * Status of this plugin's most recent publish attempt, `null` when none is
   * known.
   *
   * Drift and the state of the last attempt are two different facts, and a
   * plugin can hold both: `pending_merge` means a republish already landed on
   * the rolling sync branch and waits for someone to merge it, which leaves the
   * marketplace copy outdated and the work already done. Without this the
   * Distribution rail read that plugin as plain drift and offered to publish it
   * a second time.
   */
  lastStatus: MarketplaceDistributionStatus | null;
  /** The sync PR carrying that attempt, when one is open. */
  prUrl: string | null;
};

/**
 * Marketplace-centric pivot of the overview: one entry per marketplace the
 * current space publishes to, with its outdated plugins grouped underneath.
 * Peer to `PackageDrift` / `RepositoryDrift`.
 *
 * `plugins` empty means the marketplace is up to date, not that it is empty.
 * The list of destinations includes those; the drift-only producer that feeds
 * the sidebar badge does not emit them, because it never sees them.
 */
export type MarketplaceDrift = {
  id: MarketplaceId;
  name: string;
  plugins: MarketplacePluginDrift[];
  /**
   * Packages of the reading space this marketplace holds, outdated or not, for
   * the rail's search.
   *
   * `buildMarketplaceDriftOverview` can only fill this with the drifted ones,
   * which is all its input contains; its consumers are a badge and a stub and
   * neither searches. `selectSpaceMarketplaces` fills it from every plugin the
   * space has here, which is what the rail reads.
   */
  publishedPackageNames: string[];
};
