export type CodingAgent =
  | 'packmind'
  | 'junie'
  | 'claude'
  | 'cursor'
  | 'copilot'
  | 'agents_md';

export const CodingAgents: Record<CodingAgent, CodingAgent> = {
  packmind: 'packmind',
  junie: 'junie',
  claude: 'claude',
  cursor: 'cursor',
  copilot: 'copilot',
  agents_md: 'agents_md',
};
