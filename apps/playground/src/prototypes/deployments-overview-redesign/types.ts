export type Scenario = 'default' | 'aligned' | 'heavy' | 'stress';

export type ArtifactKind = 'standard' | 'command' | 'skill';

export type RepoRef = {
  id: string;
  owner: string;
  name: string;
};

export type Target = {
  id: string;
  name: string;
  /** When true, this is the repo root and the UI hides the target chip. */
  isDefault?: boolean;
};

export type Space = {
  id: string;
  name: string;
};

export type RepoInstall = {
  repo: RepoRef;
  target: Target;
  branch: string;
  deployedVersion: number;
  lastDeployedAt: string;
};

export type ArtifactDrift = {
  id: string;
  kind: ArtifactKind;
  name: string;
  packmindVersion: number;
  installs: RepoInstall[];
};

export type InstallLocation = {
  repo: RepoRef;
  target: Target;
  branch: string;
};

export type PackageDrift = {
  id: string;
  name: string;
  description: string;
  owner: Space;
  artifacts: ArtifactDrift[];
  installLocations: InstallLocation[];
};
