export type CodingAgent =
  | 'packmind'
  | 'junie'
  | 'claude'
  | 'cursor'
  | 'copilot'
  | 'agents_md'
  | 'gitlab_duo';

export const CodingAgents: Record<CodingAgent, CodingAgent> = {
  packmind: 'packmind',
  junie: 'junie',
  claude: 'claude',
  cursor: 'cursor',
  copilot: 'copilot',
  agents_md: 'agents_md',
  gitlab_duo: 'gitlab_duo',
};
