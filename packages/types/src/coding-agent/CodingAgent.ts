export type CodingAgent =
  | 'packmind'
  | 'junie'
  | 'claude'
  | 'claude_plugin'
  | 'cursor'
  | 'copilot'
  | 'agents_md'
  | 'gitlab_duo'
  | 'continue'
  | 'opencode'
  | 'codex';

export const CodingAgents: Record<CodingAgent, CodingAgent> = {
  packmind: 'packmind',
  junie: 'junie',
  claude: 'claude',
  claude_plugin: 'claude_plugin',
  cursor: 'cursor',
  copilot: 'copilot',
  agents_md: 'agents_md',
  gitlab_duo: 'gitlab_duo',
  continue: 'continue',
  opencode: 'opencode',
  codex: 'codex',
};
