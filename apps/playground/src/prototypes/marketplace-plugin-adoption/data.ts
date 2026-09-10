import type {
  Agent,
  Install,
  InstallScope,
  Marketplace,
  Plugin,
  Scenario,
} from './types';

// Stub data only — the playground never calls the backend.
//
// The install list is deliberately messy: long repository paths, an
// unresolvable remote, machine-wide installs with no repository at all, masked
// emails standing in for unattributed people, a Copilot install identified by
// git commit email, and one heartbeat that never reported a revision. A design
// that only reads well on tidy data is not finished.

const PUBLISHED_REVISION = 'a1b2c3d4e5f6';
const STALE_REVISION = '7f0e9c21ab34';
const ANCIENT_REVISION = '3d5a88b19c02';

type PersonSeed = {
  label: string;
  resolved: boolean;
  source: Install['identitySource'];
};

const PEOPLE: Record<string, PersonSeed> = {
  bruno: { label: 'Bruno Sanchez', resolved: true, source: 'claude-account' },
  marc: { label: 'Marc Reed', resolved: true, source: 'claude-account' },
  olga: { label: 'Olga Petrova', resolved: true, source: 'claude-account' },
  yuki: { label: 'Yuki Tanaka', resolved: true, source: 'claude-account' },
  emile: {
    label: 'Émile Rousseau-Lafayette',
    resolved: true,
    source: 'claude-account',
  },
  anonFront: {
    label: 'l**.m***@acme.com',
    resolved: false,
    source: 'claude-account',
  },
  anonData: {
    label: 'd***.p***@acme-corp-data-platform.example.com',
    resolved: false,
    source: 'git-config',
  },
  contractor: {
    label: 'j**.d***@partner-consulting.io',
    resolved: false,
    source: 'git-config',
  },
  ci: { label: 'c*-r***@acme.com', resolved: false, source: 'git-config' },
  unknown: { label: 'Unknown installer', resolved: false, source: null },
};

type InstallSeed = {
  id: string;
  repo: string | null;
  scope: InstallScope;
  agent: Agent;
  person: keyof typeof PEOPLE;
  revision: string | null;
  lastSeenMinutes: number;
  /** Repo-bound install whose remote could not be resolved. */
  unresolvedRepo?: boolean;
};

function toInstall(seed: InstallSeed): Install {
  const person = PEOPLE[seed.person];
  return {
    id: seed.id,
    scope: seed.scope,
    agent: seed.agent,
    repoKey: seed.scope === 'user' ? '' : (seed.repo ?? ''),
    repoResolved: seed.scope === 'user' ? true : !seed.unresolvedRepo,
    personLabel: person.label,
    personResolved: person.resolved,
    identitySource: person.source,
    installedRevision: seed.revision,
    lastSeenMinutes: seed.lastSeenMinutes,
  };
}

// ── Primary plugin: 24 hand-written installs ────────────────────────────────

const REACT_CONVENTIONS_SEEDS: InstallSeed[] = [
  // A repo where three people work: the newest heartbeat is current, but one
  // checkout is on a local override that never updated.
  {
    id: 'i01',
    repo: 'acme-corp/web-frontend',
    scope: 'project',
    agent: 'claude-code',
    person: 'bruno',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 12,
  },
  {
    id: 'i02',
    repo: 'acme-corp/web-frontend',
    scope: 'local',
    agent: 'claude-code',
    person: 'marc',
    revision: STALE_REVISION,
    lastSeenMinutes: 220,
  },
  {
    id: 'i03',
    repo: 'acme-corp/web-frontend',
    scope: 'project',
    agent: 'copilot-cli',
    person: 'olga',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 48,
  },

  {
    id: 'i04',
    repo: 'acme-corp/design-system',
    scope: 'project',
    agent: 'claude-code',
    person: 'olga',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 95,
  },
  {
    id: 'i05',
    repo: 'acme-corp/design-system',
    scope: 'project',
    agent: 'claude-code',
    person: 'emile',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 1500,
  },

  // Long path, and the whole repo is two revisions behind.
  {
    id: 'i06',
    repo: 'acme-corp/checkout-experience-legacy-monolith',
    scope: 'project',
    agent: 'claude-code',
    person: 'marc',
    revision: ANCIENT_REVISION,
    lastSeenMinutes: 3100,
  },
  {
    id: 'i07',
    repo: 'acme-corp/checkout-experience-legacy-monolith',
    scope: 'local',
    agent: 'claude-code',
    person: 'anonFront',
    revision: ANCIENT_REVISION,
    lastSeenMinutes: 5400,
  },

  {
    id: 'i08',
    repo: 'acme-corp/api-gateway',
    scope: 'project',
    agent: 'claude-code',
    person: 'yuki',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 30,
  },

  {
    id: 'i09',
    repo: 'acme-corp/mobile-app',
    scope: 'project',
    agent: 'copilot-cli',
    person: 'yuki',
    revision: STALE_REVISION,
    lastSeenMinutes: 610,
  },
  {
    id: 'i10',
    repo: 'acme-corp/mobile-app',
    scope: 'project',
    agent: 'claude-code',
    person: 'bruno',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 140,
  },

  // Heartbeat reported no revision at all — cannot be confirmed current.
  {
    id: 'i11',
    repo: 'acme-corp/data-platform-ingestion-pipelines',
    scope: 'project',
    agent: 'claude-code',
    person: 'anonData',
    revision: null,
    lastSeenMinutes: 900,
  },

  // Copilot exposes no account identity, so the label is a git commit email.
  {
    id: 'i12',
    repo: 'contractors/acme-partner-portal',
    scope: 'project',
    agent: 'copilot-cli',
    person: 'contractor',
    revision: STALE_REVISION,
    lastSeenMinutes: 2600,
  },

  {
    id: 'i13',
    repo: 'acme-corp/internal-tools',
    scope: 'project',
    agent: 'claude-code',
    person: 'marc',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 70,
  },
  {
    id: 'i14',
    repo: 'acme-corp/internal-tools',
    scope: 'local',
    agent: 'claude-code',
    person: 'bruno',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 200,
  },

  {
    id: 'i15',
    repo: 'acme-corp/docs-site',
    scope: 'project',
    agent: 'claude-code',
    person: 'emile',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 480,
  },
  {
    id: 'i16',
    repo: 'acme-corp/growth-experiments',
    scope: 'project',
    agent: 'claude-code',
    person: 'olga',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 1200,
  },
  {
    id: 'i17',
    repo: 'acme-corp/growth-experiments',
    scope: 'local',
    agent: 'copilot-cli',
    person: 'ci',
    revision: STALE_REVISION,
    lastSeenMinutes: 4300,
  },

  // Repo-bound install with no usable remote — today this row is labelled
  // "Unidentified repository" and stays invisible on the person axis.
  {
    id: 'i18',
    repo: null,
    scope: 'local',
    agent: 'claude-code',
    person: 'unknown',
    revision: STALE_REVISION,
    lastSeenMinutes: 7000,
    unresolvedRepo: true,
  },

  // Machine-wide installs: global to a person, bound to no repository. In
  // today's UI these live behind the "By person" tab and are invisible from
  // "By repo", which is why a reader can never see the full picture at once.
  {
    id: 'i19',
    repo: null,
    scope: 'user',
    agent: 'claude-code',
    person: 'bruno',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 15,
  },
  {
    id: 'i20',
    repo: null,
    scope: 'user',
    agent: 'claude-code',
    person: 'yuki',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 260,
  },
  {
    id: 'i21',
    repo: null,
    scope: 'user',
    agent: 'claude-code',
    person: 'emile',
    revision: STALE_REVISION,
    lastSeenMinutes: 2000,
  },
  {
    id: 'i22',
    repo: null,
    scope: 'user',
    agent: 'copilot-cli',
    person: 'contractor',
    revision: null,
    lastSeenMinutes: 6000,
  },
  {
    id: 'i23',
    repo: null,
    scope: 'user',
    agent: 'claude-code',
    person: 'anonFront',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 340,
  },
  {
    id: 'i24',
    repo: null,
    scope: 'user',
    agent: 'copilot-cli',
    person: 'olga',
    revision: PUBLISHED_REVISION,
    lastSeenMinutes: 55,
  },
];

// ── Generated installs for the other plugins ────────────────────────────────

/** Deterministic pseudo-random source: the same review always sees the same data. */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const GENERATED_REPOS = [
  'acme-corp/web-frontend',
  'acme-corp/design-system',
  'acme-corp/api-gateway',
  'acme-corp/mobile-app',
  'acme-corp/internal-tools',
  'acme-corp/docs-site',
  'acme-corp/billing-service',
  'acme-corp/notifications-worker',
  'acme-corp/search-indexer',
  'acme-corp/growth-experiments',
  'acme-corp/checkout-experience-legacy-monolith',
  'acme-corp/data-platform-ingestion-pipelines',
  'acme-corp/identity-provider-bridge',
  'contractors/acme-partner-portal',
];

const GENERATED_PEOPLE: Array<keyof typeof PEOPLE> = [
  'bruno',
  'marc',
  'olga',
  'yuki',
  'emile',
  'anonFront',
  'anonData',
  'contractor',
  'ci',
];

function generateInstalls(
  prefix: string,
  count: number,
  seed: number,
  outdatedShare: number,
): Install[] {
  const random = lcg(seed);
  const installs: Install[] = [];
  // The backend collapses repeated heartbeats onto a UNIQUE (plugin, scope,
  // agent, identity, repo) row, so generating two installs that share those
  // five would put a state on screen that cannot exist.
  const seen = new Set<string>();
  let attempts = 0;
  while (installs.length < count && attempts < count * 20) {
    attempts += 1;
    const isGlobal = random() < 0.18;
    const scope: InstallScope = isGlobal
      ? 'user'
      : random() < 0.75
        ? 'project'
        : 'local';
    const repo = isGlobal
      ? null
      : GENERATED_REPOS[Math.floor(random() * GENERATED_REPOS.length)];
    const agent = random() < 0.72 ? 'claude-code' : 'copilot-cli';
    const person =
      GENERATED_PEOPLE[Math.floor(random() * GENERATED_PEOPLE.length)];
    const behind = random() < outdatedShare;
    const lastSeenMinutes = Math.floor(random() * 8000) + 5;

    const key = `${scope}|${agent}|${person}|${repo ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);

    installs.push(
      toInstall({
        id: `${prefix}-${installs.length}`,
        repo,
        scope,
        agent,
        person,
        revision: behind
          ? random() < 0.3
            ? ANCIENT_REVISION
            : STALE_REVISION
          : PUBLISHED_REVISION,
        lastSeenMinutes,
      }),
    );
  }
  return installs;
}

// ── Plugins ─────────────────────────────────────────────────────────────────

const REACT_CONVENTIONS: Plugin = {
  id: 'plg-react',
  slug: 'react-conventions',
  name: 'React conventions',
  spaceName: 'Frontend',
  spaceColor: 'blue',
  version: '0.1.0',
  publishedRevision: PUBLISHED_REVISION,
  publishedRelative: '2 days ago',
  isOutdated: true,
  changes: [
    {
      kind: 'updated',
      artifactKind: 'standard',
      target: 'React component structure',
    },
    { kind: 'added', artifactKind: 'skill', target: 'writing-a-custom-hook' },
    {
      kind: 'removed',
      artifactKind: 'command',
      target: 'scaffold-class-component',
    },
  ],
  artifacts: [
    {
      kind: 'standard',
      name: 'React component structure',
      summary: '9 rules on file layout, prop typing and hook boundaries',
    },
    {
      kind: 'standard',
      name: 'State management discipline',
      summary: '5 rules on where state may live',
    },
    {
      kind: 'skill',
      name: 'writing-a-custom-hook',
      summary: 'Extract logic into a reusable hook, with tests',
    },
    {
      kind: 'command',
      name: 'review-component',
      summary: 'Review a component against the two standards above',
    },
  ],
  installs: REACT_CONVENTIONS_SEEDS.map(toInstall),
};

const OTHER_PLUGINS: Plugin[] = [
  {
    id: 'plg-design',
    slug: 'design-system-rules',
    name: 'Design system rules',
    spaceName: 'Design Ops',
    spaceColor: 'purple',
    version: '0.1.0',
    publishedRevision: 'bb41f0c7d219',
    publishedRelative: '6 hours ago',
    isOutdated: false,
    changes: [],
    artifacts: [
      {
        kind: 'standard',
        name: 'Token usage',
        summary: '7 rules — never hardcode a colour',
      },
      {
        kind: 'skill',
        name: 'adding-a-pm-component',
        summary: 'Add a PM* wrapper around a Chakra primitive',
      },
    ],
    installs: generateInstalls('des', 12, 7, 0.25),
  },
  {
    id: 'plg-api',
    slug: 'api-guidelines',
    name: 'API guidelines',
    spaceName: 'Platform',
    spaceColor: 'teal',
    version: '0.1.0',
    publishedRevision: 'c9d2e7104b8a',
    publishedRelative: '3 weeks ago',
    isOutdated: true,
    changes: [
      { kind: 'updated', artifactKind: 'standard', target: 'Error envelope' },
    ],
    artifacts: [
      {
        kind: 'standard',
        name: 'Error envelope',
        summary: '4 rules on error shape and status codes',
      },
      {
        kind: 'standard',
        name: 'Pagination',
        summary: '3 rules — cursor only',
      },
      {
        kind: 'command',
        name: 'review-endpoint',
        summary: 'Check a route against the guidelines',
      },
    ],
    installs: generateInstalls('api', 31, 21, 0.45),
  },
  {
    id: 'plg-testing',
    slug: 'testing-playbook',
    name: 'Testing playbook',
    spaceName: 'Quality',
    spaceColor: 'green',
    version: '0.1.0',
    publishedRevision: 'e10a4b6f8c33',
    publishedRelative: '5 days ago',
    isOutdated: false,
    changes: [],
    artifacts: [
      {
        kind: 'standard',
        name: 'Test assertions',
        summary: 'One positive expect per it()',
      },
      {
        kind: 'skill',
        name: 'writing-an-e2e-test',
        summary: 'Playwright fixtures and page objects',
      },
    ],
    installs: generateInstalls('tst', 7, 33, 0.15),
  },
  {
    id: 'plg-security',
    slug: 'security-review-kit',
    name: 'Security review kit',
    spaceName: 'Security',
    spaceColor: 'red',
    version: '0.1.0',
    // Published before revision tracking existed — drift is indeterminate.
    publishedRevision: null,
    publishedRelative: '4 months ago',
    isOutdated: false,
    changes: [],
    artifacts: [
      {
        kind: 'standard',
        name: 'Secrets handling',
        summary: '6 rules — never hardcode a secret',
      },
      {
        kind: 'subagent',
        name: 'threat-modeller',
        summary: 'Walks a change through STRIDE',
      },
    ],
    installs: generateInstalls('sec', 9, 44, 0.4),
  },
  {
    id: 'plg-onboarding',
    slug: 'onboarding-starter',
    name: 'Onboarding starter',
    spaceName: 'Enablement',
    spaceColor: 'orange',
    version: '0.1.0',
    publishedRevision: 'f4c8b2a09d71',
    publishedRelative: '1 hour ago',
    isOutdated: false,
    changes: [],
    artifacts: [
      {
        kind: 'command',
        name: 'first-week-tour',
        summary: 'Guided tour of the codebase',
      },
    ],
    // Just published: nobody has started a session with it yet.
    installs: [],
  },
];

const BASE_MARKETPLACE: Marketplace = {
  id: 'mkt-frontend',
  name: 'acme-playbooks',
  repoPath: 'acme-corp/acme-playbooks',
  plugins: [REACT_CONVENTIONS, ...OTHER_PLUGINS],
};

// ── Scenario shaping ────────────────────────────────────────────────────────

function mapPrimary(
  marketplace: Marketplace,
  transform: (plugin: Plugin) => Plugin,
): Marketplace {
  return {
    ...marketplace,
    plugins: marketplace.plugins.map((plugin) =>
      plugin.id === REACT_CONVENTIONS.id ? transform(plugin) : plugin,
    ),
  };
}

export function buildMarketplace(scenario: Scenario): Marketplace {
  switch (scenario) {
    case 'single-agent':
      return {
        ...BASE_MARKETPLACE,
        plugins: BASE_MARKETPLACE.plugins.map((plugin) => ({
          ...plugin,
          installs: plugin.installs.filter((i) => i.agent === 'claude-code'),
        })),
      };
    case 'all-current':
      return mapPrimary(BASE_MARKETPLACE, (plugin) => ({
        ...plugin,
        isOutdated: false,
        changes: [],
        installs: plugin.installs.map((install) => ({
          ...install,
          installedRevision: plugin.publishedRevision,
        })),
      }));
    case 'no-consumers':
      return mapPrimary(BASE_MARKETPLACE, (plugin) => ({
        ...plugin,
        installs: [],
      }));
    case 'revision-unknown':
      return mapPrimary(BASE_MARKETPLACE, (plugin) => ({
        ...plugin,
        publishedRevision: null,
      }));
    case 'at-scale':
      return mapPrimary(BASE_MARKETPLACE, (plugin) => ({
        ...plugin,
        installs: [
          ...plugin.installs,
          ...generateInstalls('scale', 152, 99, 0.38),
        ],
      }));
    default:
      return BASE_MARKETPLACE;
  }
}

export const SCENARIO_ITEMS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default — 24 installs, mixed', value: 'default' },
  { label: 'One agent only', value: 'single-agent' },
  { label: 'Everything up to date', value: 'all-current' },
  { label: 'No consumers yet', value: 'no-consumers' },
  { label: 'Published revision unknown', value: 'revision-unknown' },
  { label: 'At scale — large fleet', value: 'at-scale' },
  { label: 'Loading', value: 'loading' },
];
