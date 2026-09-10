// Types for the flattened plugin-adoption surface.
//
// The unit of truth is a single *install*: one (plugin, scope, agent, person,
// repo) heartbeat, mirroring the backend's PluginInstallation row. Everything
// the UI shows — "by repo", "by person", "by agent" — is a grouping of that one
// list, never a separate dataset. That is the core change from today's design,
// where "By repo" and "By person" were disjoint sets that hid each other's rows.

export type Agent = 'claude-code' | 'copilot-cli';

export const AGENT_LABEL: Record<Agent, string> = {
  'claude-code': 'Claude Code',
  'copilot-cli': 'Copilot CLI',
};

/** Where the plugin is enabled in the agent's settings. */
export type InstallScope = 'project' | 'local' | 'user';

export const SCOPE_LABEL: Record<InstallScope, string> = {
  project: 'Project',
  local: 'Local',
  user: 'Machine-wide',
};

export const SCOPE_HINT: Record<InstallScope, string> = {
  project:
    'Committed in the repository — everyone working on it gets the plugin',
  local: 'Enabled for this checkout only, not committed',
  user: 'Enabled globally for this person, in every repository they open',
};

/** Which local signal the person label came from. */
export type IdentitySource = 'claude-account' | 'git-config';

export type InstallStatus = 'up-to-date' | 'behind' | 'unknown';

export type GroupMode = 'repository' | 'person' | 'agent' | 'none';

export type StatusFilter = 'all' | 'up-to-date' | 'behind';

export type Install = {
  id: string;
  scope: InstallScope;
  agent: Agent;
  /** Normalized `owner/repo`. Empty for machine-wide installs and for repos the agent could not resolve. */
  repoKey: string;
  /** False when a repo-bound install reported no usable remote. */
  repoResolved: boolean;
  /** Display label: a Packmind user name, a masked email, or "Unknown installer". */
  personLabel: string;
  /** True when the install was attributed to a signed-in Packmind user. */
  personResolved: boolean;
  identitySource: IdentitySource | null;
  /** Content revision the heartbeat reported. Null when it reported none. */
  installedRevision: string | null;
  lastSeenMinutes: number;
};

export type ArtifactKind =
  | 'standard'
  | 'command'
  | 'skill'
  | 'subagent'
  | 'hook';

export type PluginArtifact = {
  kind: ArtifactKind;
  name: string;
  summary: string;
};

export type PluginChange = {
  kind: 'added' | 'updated' | 'removed';
  artifactKind: ArtifactKind;
  target: string;
};

export type Plugin = {
  id: string;
  slug: string;
  name: string;
  spaceName: string;
  spaceColor: string;
  version: string;
  /** Published content revision; null for plugins published before revisions shipped. */
  publishedRevision: string | null;
  publishedRelative: string;
  isOutdated: boolean;
  changes: PluginChange[];
  artifacts: PluginArtifact[];
  installs: Install[];
};

export type Marketplace = {
  id: string;
  name: string;
  repoPath: string;
  plugins: Plugin[];
};

export type AdoptionFilters = {
  query: string;
  status: StatusFilter;
  /** Empty means "every scope" — an explicit empty selection is not a valid state. */
  scopes: InstallScope[];
  agents: Agent[];
};

export const NO_FILTERS: AdoptionFilters = {
  query: '',
  status: 'all',
  scopes: [],
  agents: [],
};

export type Scenario =
  | 'default'
  | 'single-agent'
  | 'all-current'
  | 'no-consumers'
  | 'revision-unknown'
  | 'at-scale'
  | 'loading';

export type DetailTabId = 'overview' | 'changes' | 'adoption';
