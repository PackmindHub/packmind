export type Agent = 'Claude Code' | 'Copilot';

export const AGENT_LABEL: Record<Agent, string> = {
  'Claude Code': 'Claude Code',
  Copilot: 'GitHub Copilot',
};

export type MarketplaceState = 'healthy' | 'drift' | 'unreachable';

export type Space = {
  id: string;
  name: string;
};

export type ArtifactKind = 'standard' | 'command' | 'skill';

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  name: string;
  summary: string;
};

export type PluginState = 'healthy' | 'drift';

export type SourcePackageChangeKind = 'added' | 'updated' | 'removed';

export type SourcePackageChange = {
  kind: SourcePackageChangeKind;
  target: string;
  artifactKind: ArtifactKind;
};

export type SourcePackageSync =
  | { state: 'in-sync'; sourceVersion: string }
  | {
      state: 'behind';
      sourceVersion: string;
      changes: SourcePackageChange[];
    };

export type Installer = {
  name: string;
  initials: string;
};

export type RepoAdoption = {
  repoPath: string;
  installedVersion: string;
  installer: Installer;
  installedRelative: string;
  isOutdated: boolean;
};

export type Plugin = {
  id: string;
  name: string;
  packageSlug: string;
  version: string;
  mandatory: boolean;
  owner: Space;
  description: string;
  lastPublishedRelative: string;
  state: PluginState;
  sourceSync: SourcePackageSync;
  adoption: {
    reposOnVersion: number;
    outdatedRepos: number;
    repos: RepoAdoption[];
  };
  artifacts: Artifact[];
};

export type MarketplaceDetail = {
  id: string;
  name: string;
  repoPath: string;
  remoteUrl: string;
  agents: Agent[];
  lastPublishedRelative: string;
  state: MarketplaceState;
  consumers: {
    repoCount: number;
    outdatedRepos: number;
  };
  plugins: Plugin[];
};

export type Scenario = 'default' | 'empty' | 'loading' | 'unreachable';
