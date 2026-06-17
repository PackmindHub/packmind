import type {
  ActivityEntry,
  GovernanceRepoRow,
  ImportedSkill,
  ProposedSkill,
  StepMeta,
} from './types';

export const STEPS: StepMeta[] = [
  {
    id: 'import',
    title: 'Import your skills',
    outcome: 'Pull the skills already living in your repos into Packmind.',
  },
  {
    id: 'bundle',
    title: 'Bundle them into a package',
    outcome: 'Group the skills you want to ship as one versioned unit.',
  },
  {
    id: 'ship',
    title: 'Ship it to a repo',
    outcome: 'Render the package into a real repo, from the CLI or the app.',
  },
  {
    id: 'govern',
    title: 'Watch it land in Governance',
    outcome: 'See which repos are on which version, and where adoption stalls.',
  },
];

// The ready-made skill we drop in so a user feels the loop without the CLI.
export const SAMPLE_SKILL: ImportedSkill = {
  id: 'sample-review-pr',
  name: 'review-pull-request',
  description:
    'Walks an agent through a structured PR review: scope, risk, tests, then a verdict.',
  source: 'sample',
  files: 3,
  agent: 'Claude Code',
};

// What the CLI proposes after `packmind-cli playbook submit`, pre-approval.
export const STUB_PROPOSED_SKILLS: ProposedSkill[] = [
  {
    id: 'prop-typeorm-migration',
    name: 'write-typeorm-migration',
    description:
      'Generates a reversible TypeORM migration with the team logging helpers.',
    files: 2,
    agent: 'Claude Code',
  },
];

// Skills already in the space for the mid-flow / activated scenarios.
// Deliberately varied: a long name, a terse one, a missing-ish description.
export const STUB_IMPORTED_SKILLS: ImportedSkill[] = [
  SAMPLE_SKILL,
  {
    id: 'skill-migrations',
    name: 'write-typeorm-migration',
    description:
      'Generates a reversible TypeORM migration with the team logging helpers.',
    source: 'cli',
    files: 2,
    agent: 'Claude Code',
  },
  {
    id: 'skill-release',
    name: 'cut-a-release-and-tag-the-monorepo-with-changelog',
    description: 'Bumps versions, writes the changelog, tags, and pushes.',
    source: 'cli',
    files: 4,
    agent: 'Cursor',
  },
  {
    id: 'skill-triage',
    name: 'triage',
    description: 'Sorts an incoming issue into a label, owner, and milestone.',
    source: 'cli',
    files: 1,
    agent: 'Copilot',
  },
];

export const STARTER_PACKAGE_NAME = 'Starter playbook';

// Governance rows once at least one repo is on the playbook.
export const STUB_GOVERNANCE_ROWS: GovernanceRepoRow[] = [
  {
    id: 'gov-api',
    repo: 'acme/api',
    packageName: STARTER_PACKAGE_NAME,
    version: 1,
    behind: 0,
    agents: ['Claude Code', 'Cursor'],
    lastInstall: 'just now',
  },
  {
    id: 'gov-web',
    repo: 'acme/web-dashboard',
    packageName: STARTER_PACKAGE_NAME,
    version: 1,
    behind: 0,
    agents: ['Copilot'],
    lastInstall: '3 hours ago',
  },
  {
    id: 'gov-infra',
    repo: 'acme/infra',
    packageName: STARTER_PACKAGE_NAME,
    version: 1,
    behind: 1,
    agents: ['Claude Code'],
    lastInstall: '2 days ago',
  },
];

export const STUB_ACTIVITY: ActivityEntry[] = [
  {
    id: 'act-1',
    initials: 'JR',
    actor: 'You',
    action: 'shipped',
    target: `${STARTER_PACKAGE_NAME} v1 to acme/api`,
    when: 'just now',
  },
  {
    id: 'act-2',
    initials: 'ML',
    actor: 'Maya Lin',
    action: 'pulled',
    target: 'the playbook into acme/web-dashboard',
    when: '3 hours ago',
  },
  {
    id: 'act-3',
    initials: 'DP',
    actor: 'Dan Park',
    action: 'approved',
    target: 'write-typeorm-migration',
    when: 'yesterday',
  },
];

// CLI command strings. Note: no token or auth copy, just the commands.
export const CLI_IMPORT_ADD = 'packmind-cli playbook add .claude/skills/<name>';
export const CLI_IMPORT_SUBMIT = 'packmind-cli playbook submit';
export const CLI_INSTALL = 'packmind-cli install';

export const STUB_REPOS = [
  { label: 'acme/api', value: 'acme/api' },
  { label: 'acme/web-dashboard', value: 'acme/web-dashboard' },
  { label: 'acme/infra', value: 'acme/infra' },
];

export const STUB_TARGETS = [
  { label: 'Root (/)', value: '/' },
  { label: 'apps/api', value: 'apps/api' },
  { label: 'packages/', value: 'packages/' },
];
