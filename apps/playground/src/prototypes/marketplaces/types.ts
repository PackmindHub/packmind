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
