export type CodingAgent =
  | 'packmind'
  | 'junie'
  | 'claude'
  | 'cursor'
  | 'copilot';

export const CodingAgents: Record<CodingAgent, CodingAgent> = {
  packmind: 'packmind',
  junie: 'junie',
  claude: 'claude',
  cursor: 'cursor',
  copilot: 'copilot',
};
