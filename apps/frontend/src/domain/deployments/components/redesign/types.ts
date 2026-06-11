import type {
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
};

export type TargetRef = {
  id: TargetId;
  name: string;
  /** True when the target points at the repo root and the UI should hide the chip. */
  isDefault?: boolean;
};

export type RepoInstall = {
  repo: RepoRef;
  target: TargetRef;
  branch: string;
  deployedVersion: number;
  lastDeployedAt: string;
};

export type ArtifactDrift = {
  id: ArtifactId;
  kind: ArtifactKind;
  name: string;
  packmindVersion: number;
  installs: RepoInstall[];
};

export type InstallLocation = {
  repo: RepoRef;
  target: TargetRef;
  branch: string;
};

export type PackageDrift = {
  id: PackageId;
  name: string;
  description: string;
  artifacts: ArtifactDrift[];
  installLocations: InstallLocation[];
};
