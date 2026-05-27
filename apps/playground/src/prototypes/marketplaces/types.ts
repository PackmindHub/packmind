export type Agent = 'Claude Code' | 'Copilot';

export const AGENT_LABEL: Record<Agent, string> = {
  'Claude Code': 'Claude Code',
  Copilot: 'GitHub Copilot',
};

export type MarketplaceState = 'healthy' | 'drift' | 'unreachable';

export type Marketplace = {
  id: string;
  name: string;
  repoPath: string;
  remoteUrl: string;
  packageCount: number;
  agents: Agent[];
  lastPublishedRelative: string;
  state: MarketplaceState;
  consumers: {
    repoCount: number;
    devCount: number;
    outdatedRepos: number;
    outdatedDevs: number;
  };
};

export type Scenario = 'default' | 'empty' | 'loading';

export type CoverageView = 'repos' | 'devs';

// ── Link-marketplace flow ────────────────────────────────────────────────────

export type Visibility = 'private' | 'public';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

export const GIT_PROVIDER_LABEL: Record<GitProvider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

export type ConnectedRepo = {
  id: string;
  path: string;
  defaultBranch: string;
  visibility: 'private' | 'internal' | 'public';
  pushedRelative: string;
  alreadyLinked?: boolean;
};

export type LinkScenario =
  | 'git-connected'
  | 'git-not-connected'
  | 'collision-on-submit';

export type PublicValidation =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | {
      kind: 'verified';
      repoPath: string;
      visibilityHint: 'public';
      defaultBranch: string;
    }
  | {
      kind: 'error';
      reason: 'not-public' | 'not-found' | 'malformed';
    };

export type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | {
      kind: 'error';
      reason: 'name-collision' | 'repo-already-linked' | 'network';
    };
