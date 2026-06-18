import type {
  DistributionStatus,
  GitProviderId,
  GitRepoId,
  PackageId,
  RecipeId,
  SkillId,
  StandardId,
  TargetId,
} from '@packmind/types';

export type ArtifactKind = 'standard' | 'command' | 'skill';

export type ArtifactId = StandardId | RecipeId | SkillId;

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
