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

export type ArtifactKind =
  | 'command'
  | 'skill'
  | 'subagent'
  | 'hook'
  | 'mcp-server';

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

export type PolicyKey = 'autoUpdate' | 'mandatory';

export type Plugin = {
  id: string;
  name: string;
  packageSlug: string;
  version: string;
  mandatory: boolean;
  autoUpdate: boolean;
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
  suggestions: Suggestion[];
};

export type Scenario =
  | 'default'
  | 'empty'
  | 'loading'
  | 'unreachable'
  | 'suggestions-cleared'
  | 'sync-fails';

export type SuggestionState = 'pending' | 'in-review' | 'approved' | 'rejected';

export type Suggester = {
  name: string;
  initials: string;
};

export type SuggestionComment = {
  author: 'admin' | 'suggester';
  authorName: string;
  at: string;
  body: string;
};

export type SuggestionDecision =
  | {
      kind: 'approved';
      by: string;
      at: string;
      appliedPolicy: {
        mandatory: boolean;
        autoUpdate: boolean;
      };
    }
  | {
      kind: 'rejected';
      by: string;
      at: string;
      reason: string;
    };

export type Suggestion = {
  id: string;
  pluginName: string;
  proposedVersion: string;
  packageSlug: string;
  description: string;
  suggester: Suggester;
  originSpace: Space;
  originUsage: {
    installsInSpace: number;
  };
  suggestedRelative: string;
  state: SuggestionState;
  artifacts: Artifact[];
  comments: SuggestionComment[];
  decision: SuggestionDecision | null;
};

export type SuggestionGroupKey = 'pending' | 'in-review' | 'decided';
