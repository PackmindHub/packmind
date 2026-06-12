import type {
  ArtifactDrift,
  ArtifactKind,
  InstallLocation,
  PackageDrift,
  RepoInstall,
  RepoRef,
  Scenario,
  Space,
  Target,
} from './types';

const SPACES: Record<string, Space> = {
  frontend: { id: 'frontend', name: 'Frontend guild' },
  platform: { id: 'platform', name: 'Platform' },
  security: { id: 'security', name: 'Security' },
  data: { id: 'data', name: 'Data platform' },
  designSystem: { id: 'design-system', name: 'Design system' },
};

const REPOS: Record<string, RepoRef> = {
  webapp: { id: 'r-webapp', owner: 'acme', name: 'webapp' },
  webappCanary: { id: 'r-webapp-canary', owner: 'acme', name: 'webapp-canary' },
  admin: { id: 'r-admin', owner: 'acme', name: 'admin-console' },
  marketing: { id: 'r-marketing', owner: 'acme', name: 'marketing-site' },
  docs: { id: 'r-docs', owner: 'acme', name: 'docs' },
  paymentsApi: { id: 'r-pay', owner: 'acme', name: 'payments-api' },
  identityApi: { id: 'r-id', owner: 'acme', name: 'identity-api' },
  searchApi: { id: 'r-search', owner: 'acme', name: 'search-api' },
  notif: { id: 'r-notif', owner: 'acme', name: 'notifications' },
  jobsRunner: { id: 'r-jobs', owner: 'acme', name: 'jobs-runner' },
  warehouse: { id: 'r-wh', owner: 'acme', name: 'data-warehouse' },
  pipelines: { id: 'r-pipe', owner: 'acme', name: 'ingest-pipelines' },
  mobile: { id: 'r-mobile', owner: 'acme', name: 'mobile-app' },
  designKit: { id: 'r-dk', owner: 'acme', name: 'design-kit' },
  platformMono: {
    id: 'r-platform-mono',
    owner: 'acme',
    name: 'platform-mono',
  },
};

const DEFAULT_TARGET: Target = { id: 't-default', name: '.', isDefault: true };

const T = {
  default: DEFAULT_TARGET,
  warehouseEtl: { id: 't-wh-etl', name: 'apps/etl' },
  warehouseDash: { id: 't-wh-dash', name: 'apps/dashboard' },
  warehouseShared: { id: 't-wh-shared', name: 'packages/shared' },
  platformApi: { id: 't-pm-api', name: 'apps/api' },
  platformWorker: { id: 't-pm-worker', name: 'apps/worker' },
  platformShared: { id: 't-pm-shared', name: 'packages/shared' },
} satisfies Record<string, Target>;

const DEFAULT_BRANCH = 'main';

const REPO_BRANCH_OVERRIDES: Record<string, string> = {
  'r-webapp-canary': 'canary',
  'r-jobs': 'staging',
  'r-pipe': 'develop',
  'r-stress-vendor': 'release/v2',
  'r-stress-legacy': 'maintenance/2023',
};

function branchFor(repo: RepoRef): string {
  return REPO_BRANCH_OVERRIDES[repo.id] ?? DEFAULT_BRANCH;
}

function loc(repo: RepoRef, target: Target, branch?: string): InstallLocation {
  return { repo, target, branch: branch ?? branchFor(repo) };
}

function install(
  repo: RepoRef,
  target: Target,
  version: number,
  when: string,
  branch?: string,
): RepoInstall {
  return {
    repo,
    target,
    branch: branch ?? branchFor(repo),
    deployedVersion: version,
    lastDeployedAt: when,
  };
}

const RELATIVE_PATTERN = /^(\d+)\s+(hour|day|week|month|year)s?\s+ago$/;

export function relativeDaysAgo(input: string): number {
  const m = input.match(RELATIVE_PATTERN);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  switch (m[2]) {
    case 'hour':
      return n / 24;
    case 'day':
      return n;
    case 'week':
      return n * 7;
    case 'month':
      return n * 30;
    case 'year':
      return n * 365;
  }
  return Number.POSITIVE_INFINITY;
}

export const STALE_DAYS_THRESHOLD = 60;

function artifact(
  id: string,
  kind: ArtifactKind,
  name: string,
  packmindVersion: number,
  installs: RepoInstall[],
): ArtifactDrift {
  return { id, kind, name, packmindVersion, installs };
}

const FRONTEND_DEFAULT: PackageDrift = {
  id: 'pkg-frontend',
  name: 'Frontend conventions',
  description:
    'React patterns, hooks discipline, and component layout for the customer-facing apps.',
  owner: SPACES.frontend,
  installLocations: [
    loc(REPOS.webapp, T.default),
    loc(REPOS.webappCanary, T.default),
    loc(REPOS.admin, T.default),
    loc(REPOS.marketing, T.default),
    loc(REPOS.mobile, T.default),
  ],
  artifacts: [
    artifact('a-fe-1', 'standard', 'react-component-layout', 5, [
      install(REPOS.webapp, T.default, 5, '2 days ago'),
      install(REPOS.webappCanary, T.default, 4, '3 weeks ago'),
      install(REPOS.admin, T.default, 5, '2 days ago'),
      install(REPOS.marketing, T.default, 3, '2 months ago'),
      install(REPOS.mobile, T.default, 5, '2 days ago'),
    ]),
    artifact('a-fe-2', 'standard', 'hooks-discipline', 3, [
      install(REPOS.webapp, T.default, 3, '5 days ago'),
      install(REPOS.webappCanary, T.default, 3, '5 days ago'),
      install(REPOS.admin, T.default, 3, '5 days ago'),
      install(REPOS.marketing, T.default, 3, '5 days ago'),
      install(REPOS.mobile, T.default, 3, '5 days ago'),
    ]),
    artifact('a-fe-3', 'command', 'scaffold-component', 4, [
      install(REPOS.webapp, T.default, 4, '1 week ago'),
      install(REPOS.webappCanary, T.default, 4, '1 week ago'),
      install(REPOS.admin, T.default, 2, '3 months ago'),
      install(REPOS.marketing, T.default, 4, '1 week ago'),
      install(REPOS.mobile, T.default, 4, '1 week ago'),
    ]),
    artifact('a-fe-4', 'skill', 'reviewing-a-pr', 2, [
      install(REPOS.webapp, T.default, 2, '4 days ago'),
      install(REPOS.webappCanary, T.default, 2, '4 days ago'),
      install(REPOS.admin, T.default, 2, '4 days ago'),
      install(REPOS.marketing, T.default, 2, '4 days ago'),
      install(REPOS.mobile, T.default, 2, '4 days ago'),
    ]),
    artifact('a-fe-5', 'command', 'extract-hook', 2, [
      install(REPOS.webapp, T.default, 2, '6 days ago'),
      install(REPOS.webappCanary, T.default, 1, '2 months ago'),
      install(REPOS.admin, T.default, 2, '6 days ago'),
      install(REPOS.marketing, T.default, 2, '6 days ago'),
      install(REPOS.mobile, T.default, 1, '2 months ago'),
    ]),
  ],
};

const PLATFORM_DEFAULT: PackageDrift = {
  id: 'pkg-platform',
  name: 'Platform & services',
  description:
    'NestJS module structure, hexagonal boundaries, and BullMQ job conventions.',
  owner: SPACES.platform,
  installLocations: [
    loc(REPOS.paymentsApi, T.default),
    loc(REPOS.identityApi, T.default),
    loc(REPOS.searchApi, T.default),
    loc(REPOS.notif, T.default),
    loc(REPOS.jobsRunner, T.default),
    loc(REPOS.platformMono, T.platformApi),
    loc(REPOS.platformMono, T.platformWorker),
    loc(REPOS.platformMono, T.platformShared),
  ],
  artifacts: [
    artifact('a-pf-1', 'standard', 'hexagonal-boundaries', 7, [
      install(REPOS.paymentsApi, T.default, 7, '1 day ago'),
      install(REPOS.identityApi, T.default, 7, '1 day ago'),
      install(REPOS.searchApi, T.default, 6, '3 weeks ago'),
      install(REPOS.notif, T.default, 7, '1 day ago'),
      install(REPOS.jobsRunner, T.default, 5, '2 months ago'),
      install(REPOS.platformMono, T.platformApi, 7, '2 days ago'),
      install(REPOS.platformMono, T.platformWorker, 5, '1 month ago'),
      install(REPOS.platformMono, T.platformShared, 7, '2 days ago'),
    ]),
    artifact('a-pf-2', 'standard', 'bullmq-job-conventions', 3, [
      install(REPOS.paymentsApi, T.default, 3, '4 days ago'),
      install(REPOS.identityApi, T.default, 3, '4 days ago'),
      install(REPOS.searchApi, T.default, 3, '4 days ago'),
      install(REPOS.notif, T.default, 3, '4 days ago'),
      install(REPOS.jobsRunner, T.default, 3, '4 days ago'),
      install(REPOS.platformMono, T.platformApi, 3, '4 days ago'),
      install(REPOS.platformMono, T.platformWorker, 2, '3 weeks ago'),
      install(REPOS.platformMono, T.platformShared, 3, '4 days ago'),
    ]),
    artifact('a-pf-3', 'command', 'generate-use-case', 4, [
      install(REPOS.paymentsApi, T.default, 4, '1 week ago'),
      install(REPOS.identityApi, T.default, 4, '1 week ago'),
      install(REPOS.searchApi, T.default, 4, '1 week ago'),
      install(REPOS.notif, T.default, 3, '1 month ago'),
      install(REPOS.jobsRunner, T.default, 3, '1 month ago'),
      install(REPOS.platformMono, T.platformApi, 4, '1 week ago'),
      install(REPOS.platformMono, T.platformWorker, 4, '1 week ago'),
      install(REPOS.platformMono, T.platformShared, 2, '2 months ago'),
    ]),
  ],
};

const SECURITY_DEFAULT: PackageDrift = {
  id: 'pkg-security',
  name: 'Security & compliance',
  description: 'Secrets handling, audit logging, and PII masking.',
  owner: SPACES.security,
  installLocations: [
    loc(REPOS.webapp, T.default),
    loc(REPOS.paymentsApi, T.default),
    loc(REPOS.identityApi, T.default),
    loc(REPOS.notif, T.default),
  ],
  artifacts: [
    artifact('a-sec-1', 'standard', 'compliance-logging-pii', 4, [
      install(REPOS.webapp, T.default, 4, '2 days ago'),
      install(REPOS.paymentsApi, T.default, 4, '2 days ago'),
      install(REPOS.identityApi, T.default, 4, '2 days ago'),
      install(REPOS.notif, T.default, 4, '2 days ago'),
    ]),
    artifact('a-sec-2', 'standard', 'secret-retrieval-via-configuration', 2, [
      install(REPOS.webapp, T.default, 2, '5 days ago'),
      install(REPOS.paymentsApi, T.default, 2, '5 days ago'),
      install(REPOS.identityApi, T.default, 2, '5 days ago'),
      install(REPOS.notif, T.default, 2, '5 days ago'),
    ]),
  ],
};

const DATA_DEFAULT: PackageDrift = {
  id: 'pkg-data',
  name: 'Data & ingest',
  description: 'Pipeline schema discipline, warehouse query patterns.',
  owner: SPACES.data,
  installLocations: [
    loc(REPOS.warehouse, T.warehouseEtl),
    loc(REPOS.warehouse, T.warehouseDash),
    loc(REPOS.warehouse, T.warehouseShared),
    loc(REPOS.pipelines, T.default),
    loc(REPOS.jobsRunner, T.default),
  ],
  artifacts: [
    artifact('a-da-1', 'standard', 'ingest-pipeline-shapes', 6, [
      install(REPOS.warehouse, T.warehouseEtl, 6, '3 days ago'),
      install(REPOS.warehouse, T.warehouseDash, 4, '6 weeks ago'),
      install(REPOS.warehouse, T.warehouseShared, 6, '3 days ago'),
      install(REPOS.pipelines, T.default, 4, '6 weeks ago'),
      install(REPOS.jobsRunner, T.default, 6, '3 days ago'),
    ]),
    artifact('a-da-2', 'command', 'profile-query', 2, [
      install(REPOS.warehouse, T.warehouseEtl, 2, '1 week ago'),
      install(REPOS.warehouse, T.warehouseDash, 1, '2 months ago'),
      install(REPOS.warehouse, T.warehouseShared, 2, '1 week ago'),
      install(REPOS.pipelines, T.default, 2, '1 week ago'),
      install(REPOS.jobsRunner, T.default, 2, '1 week ago'),
    ]),
  ],
};

const DESIGN_DEFAULT: PackageDrift = {
  id: 'pkg-design',
  name: 'Design kit usage',
  description:
    'PM-prefixed component usage, token discipline, layout patterns.',
  owner: SPACES.designSystem,
  installLocations: [
    loc(REPOS.webapp, T.default),
    loc(REPOS.webappCanary, T.default),
    loc(REPOS.admin, T.default),
    loc(REPOS.marketing, T.default),
    loc(REPOS.designKit, T.default),
    loc(REPOS.docs, T.default),
  ],
  artifacts: [
    artifact('a-ds-1', 'standard', 'pm-component-usage', 3, [
      install(REPOS.webapp, T.default, 3, '1 day ago'),
      install(REPOS.webappCanary, T.default, 3, '1 day ago'),
      install(REPOS.admin, T.default, 3, '1 day ago'),
      install(REPOS.marketing, T.default, 3, '1 day ago'),
      install(REPOS.designKit, T.default, 3, '1 day ago'),
      install(REPOS.docs, T.default, 3, '1 day ago'),
    ]),
    artifact('a-ds-2', 'standard', 'token-discipline', 3, [
      install(REPOS.webapp, T.default, 3, '1 day ago'),
      install(REPOS.webappCanary, T.default, 3, '1 day ago'),
      install(REPOS.admin, T.default, 3, '1 day ago'),
      install(REPOS.marketing, T.default, 3, '1 day ago'),
      install(REPOS.designKit, T.default, 3, '1 day ago'),
      install(REPOS.docs, T.default, 3, '1 day ago'),
    ]),
  ],
};

function alignArtifact(art: ArtifactDrift): ArtifactDrift {
  return {
    ...art,
    installs: art.installs.map((i) => ({
      ...i,
      deployedVersion: art.packmindVersion,
    })),
  };
}

function alignPackage(pkg: PackageDrift): PackageDrift {
  return { ...pkg, artifacts: pkg.artifacts.map(alignArtifact) };
}

function heavyDriftArtifact(
  art: ArtifactDrift,
  packmindBump: number,
): ArtifactDrift {
  const nextPackmind = art.packmindVersion + packmindBump;
  return {
    ...art,
    packmindVersion: nextPackmind,
    installs: art.installs.map((i, idx) => ({
      ...i,
      deployedVersion:
        idx % 3 === 0
          ? nextPackmind
          : idx % 3 === 1
            ? Math.max(1, nextPackmind - 2)
            : Math.max(1, nextPackmind - 4),
      lastDeployedAt:
        idx % 3 === 0
          ? i.lastDeployedAt
          : idx % 3 === 1
            ? '2 weeks ago'
            : '3 months ago',
    })),
  };
}

function heavyDriftPackage(pkg: PackageDrift, bump = 2): PackageDrift {
  return {
    ...pkg,
    artifacts: pkg.artifacts.map((a) => heavyDriftArtifact(a, bump)),
  };
}

const DEFAULT_PACKAGES: PackageDrift[] = [
  FRONTEND_DEFAULT,
  PLATFORM_DEFAULT,
  SECURITY_DEFAULT,
  DATA_DEFAULT,
  DESIGN_DEFAULT,
];

const ALIGNED_PACKAGES: PackageDrift[] = DEFAULT_PACKAGES.map(alignPackage);

const HEAVY_PACKAGES: PackageDrift[] = DEFAULT_PACKAGES.map((p) =>
  heavyDriftPackage(p, 3),
);

// ---------------------------------------------------------------------------
// Stress scenario: edge cases the layout should still survive.
// ---------------------------------------------------------------------------

const STRESS_REPOS: Record<string, RepoRef> = {
  bigMono: {
    id: 'r-stress-mono',
    owner: 'acme-engineering-platform',
    name: 'everything-monorepo-with-a-really-long-name',
  },
  shortName: { id: 'r-stress-a', owner: 'a', name: 'b' },
  legacy: {
    id: 'r-stress-legacy',
    owner: 'acme',
    name: 'legacy-batch-processor-v2',
  },
  vendorFork: {
    id: 'r-stress-vendor',
    owner: 'acme-third-party-vendor-team',
    name: 'forked-upstream-typescript-language-server',
  },
};

const STRESS_TARGETS = {
  appsApi: { id: 'st-apps-api', name: 'apps/api' },
  appsAdmin: { id: 'st-apps-admin', name: 'apps/admin' },
  appsMobile: { id: 'st-apps-mobile', name: 'apps/mobile' },
  appsInternal: {
    id: 'st-apps-internal',
    name: 'apps/internal-tools/admin-dashboard',
  },
  appsCustomer: {
    id: 'st-apps-customer',
    name: 'apps/customer-facing/storefront-next-app',
  },
  pkgShared: { id: 'st-pkg-shared', name: 'packages/shared' },
  pkgUtils: { id: 'st-pkg-utils', name: 'packages/utils' },
  pkgUiKit: {
    id: 'st-pkg-uikit',
    name: 'packages/internal-design-system-ui-kit',
  },
  servicesAuth: {
    id: 'st-svc-auth',
    name: 'services/authentication-and-authorization',
  },
} satisfies Record<string, Target>;

function stressArt(
  id: string,
  kind: ArtifactKind,
  name: string,
  packmindVersion: number,
  installs: RepoInstall[],
): ArtifactDrift {
  return { id, kind, name, packmindVersion, installs };
}

const STRESS_MEGA_LOCATIONS: InstallLocation[] = [
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsApi),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsAdmin),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsMobile),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsInternal),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsCustomer),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.pkgShared),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.pkgUtils),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.pkgUiKit),
  loc(STRESS_REPOS.bigMono, STRESS_TARGETS.servicesAuth),
  loc(REPOS.webapp, T.default),
  loc(REPOS.webappCanary, T.default),
  loc(REPOS.admin, T.default),
  loc(REPOS.marketing, T.default),
  loc(REPOS.mobile, T.default),
  loc(REPOS.paymentsApi, T.default),
  loc(REPOS.identityApi, T.default),
  loc(REPOS.searchApi, T.default),
  loc(REPOS.notif, T.default),
  loc(REPOS.jobsRunner, T.default),
  loc(REPOS.warehouse, T.warehouseEtl),
  loc(REPOS.warehouse, T.warehouseDash),
  loc(REPOS.warehouse, T.warehouseShared),
  loc(REPOS.pipelines, T.default),
  loc(REPOS.designKit, T.default),
  loc(REPOS.docs, T.default),
  loc(STRESS_REPOS.legacy, T.default),
  loc(STRESS_REPOS.vendorFork, T.default),
];

function buildStressArtifacts(): ArtifactDrift[] {
  type ArtDef = {
    id: string;
    kind: ArtifactKind;
    name: string;
    packmindVersion: number;
  };
  const defs: ArtDef[] = [
    {
      id: 's-art-1',
      kind: 'standard',
      name: 'typescript-strict-mode-and-no-any-discipline',
      packmindVersion: 12,
    },
    {
      id: 's-art-2',
      kind: 'standard',
      name: 'hexagonal-architecture-and-dependency-direction',
      packmindVersion: 18,
    },
    {
      id: 's-art-3',
      kind: 'standard',
      name: 'error-handling-and-domain-errors',
      packmindVersion: 7,
    },
    {
      id: 's-art-4',
      kind: 'standard',
      name: 'observability-structured-logging-and-traces',
      packmindVersion: 9,
    },
    {
      id: 's-art-5',
      kind: 'standard',
      name: 'secret-retrieval-via-configuration-service',
      packmindVersion: 4,
    },
    {
      id: 's-art-6',
      kind: 'standard',
      name: 'wcag-aa-accessibility-baseline',
      packmindVersion: 6,
    },
    {
      id: 's-art-7',
      kind: 'standard',
      name: 'performance-budgets-and-bundle-size',
      packmindVersion: 3,
    },
    {
      id: 's-art-8',
      kind: 'standard',
      name: 'code-review-etiquette-and-comment-protocol',
      packmindVersion: 22,
    },
    {
      id: 's-art-9',
      kind: 'standard',
      name: 'on-call-runbook-and-incident-response',
      packmindVersion: 5,
    },
    {
      id: 's-art-10',
      kind: 'command',
      name: 'scaffold-hexagonal-use-case',
      packmindVersion: 11,
    },
    {
      id: 's-art-11',
      kind: 'command',
      name: 'generate-typed-error-class-with-domain-tag',
      packmindVersion: 8,
    },
    {
      id: 's-art-12',
      kind: 'command',
      name: 'add-otel-spans-around-this-function',
      packmindVersion: 4,
    },
    {
      id: 's-art-13',
      kind: 'command',
      name: 'extract-and-rename-prop-across-call-sites',
      packmindVersion: 2,
    },
    {
      id: 's-art-14',
      kind: 'command',
      name: 'rip-out-deprecated-singleton',
      packmindVersion: 1,
    },
    {
      id: 's-art-15',
      kind: 'skill',
      name: 'reviewing-a-pr-with-the-staff-eng-checklist',
      packmindVersion: 14,
    },
    {
      id: 's-art-16',
      kind: 'skill',
      name: 'investigating-a-production-incident-from-pager-to-postmortem',
      packmindVersion: 6,
    },
    {
      id: 's-art-17',
      kind: 'skill',
      name: 'writing-an-rfc-the-team-will-actually-read',
      packmindVersion: 3,
    },
    {
      id: 's-art-18',
      kind: 'skill',
      name: 'pairing-with-an-ai-agent-effectively',
      packmindVersion: 9,
    },
  ];

  // Use the MEGA installLocations so every artifact has an entry per location.
  const locations = STRESS_MEGA_LOCATIONS;
  return defs.map((def, ai) =>
    stressArt(
      def.id,
      def.kind,
      def.name,
      def.packmindVersion,
      locations.map((location, li) => {
        const gap = ((ai * 7 + li * 13) % 9) - 3; // -3..5
        const aligned = gap <= 0;
        const deployed = aligned
          ? def.packmindVersion
          : Math.max(1, def.packmindVersion - gap);
        const ages = [
          '1 day ago',
          '4 days ago',
          '2 weeks ago',
          '1 month ago',
          '3 months ago',
          '6 months ago',
        ];
        return {
          repo: location.repo,
          target: location.target,
          branch: location.branch,
          deployedVersion: deployed,
          lastDeployedAt: ages[(ai + li) % ages.length],
        };
      }),
    ),
  );
}

const STRESS_MEGA: PackageDrift = {
  id: 'pkg-stress-mega',
  name: 'Engineering excellence — the full bundle (every standard, every command, every skill the staff engineering team owns)',
  description:
    'Cross-cutting conventions for the whole engineering org. Covers TypeScript discipline, hexagonal architecture, error handling, observability, secrets, accessibility, performance budgets, code review etiquette, and on-call playbooks. This package is intentionally large so the UI gets stress-tested by a real worst-case payload.',
  owner: SPACES.platform,
  installLocations: STRESS_MEGA_LOCATIONS,
  artifacts: buildStressArtifacts(),
};

const STRESS_TINY: PackageDrift = {
  id: 'pkg-stress-tiny',
  name: 'Tiny',
  description: 'Single-artifact, single-install. Smallest possible package.',
  owner: SPACES.designSystem,
  installLocations: [loc(STRESS_REPOS.shortName, T.default)],
  artifacts: [
    stressArt('s-tiny-1', 'standard', 'one-rule', 1, [
      install(STRESS_REPOS.shortName, T.default, 1, '2 hours ago'),
    ]),
  ],
};

const STRESS_LONG_NAMES: PackageDrift = {
  id: 'pkg-stress-long',
  name: 'Reusable component testing patterns for the design system migration to PMComponents v3',
  description:
    'Test conventions, fixtures, and snapshot strategies for the design system migration. Names are intentionally long across artifacts, repos, and targets so the layout has to survive worst-case strings.',
  owner: SPACES.frontend,
  installLocations: [
    loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsCustomer),
    loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsInternal),
    loc(STRESS_REPOS.vendorFork, T.default),
  ],
  artifacts: [
    stressArt(
      's-long-1',
      'standard',
      'how-to-test-deeply-nested-controlled-components-with-react-testing-library-and-msw',
      4,
      [
        install(
          STRESS_REPOS.bigMono,
          STRESS_TARGETS.appsCustomer,
          2,
          '2 months ago',
        ),
        install(
          STRESS_REPOS.bigMono,
          STRESS_TARGETS.appsInternal,
          4,
          '3 days ago',
        ),
        install(STRESS_REPOS.vendorFork, T.default, 1, '8 months ago'),
      ],
    ),
    stressArt(
      's-long-2',
      'command',
      'generate-snapshot-test-with-accessibility-assertions-for-this-component',
      2,
      [
        install(
          STRESS_REPOS.bigMono,
          STRESS_TARGETS.appsCustomer,
          2,
          '3 days ago',
        ),
        install(
          STRESS_REPOS.bigMono,
          STRESS_TARGETS.appsInternal,
          1,
          '6 weeks ago',
        ),
        install(STRESS_REPOS.vendorFork, T.default, 1, '6 weeks ago'),
      ],
    ),
    stressArt(
      's-long-3',
      'skill',
      'migrating-a-legacy-class-component-to-the-current-functional-pattern-without-breaking-its-tests',
      7,
      [
        install(
          STRESS_REPOS.bigMono,
          STRESS_TARGETS.appsCustomer,
          7,
          '1 day ago',
        ),
        install(
          STRESS_REPOS.bigMono,
          STRESS_TARGETS.appsInternal,
          7,
          '1 day ago',
        ),
        install(STRESS_REPOS.vendorFork, T.default, 4, '4 months ago'),
      ],
    ),
  ],
};

const STRESS_BIG_GAPS: PackageDrift = {
  id: 'pkg-stress-big-gaps',
  name: 'Legacy compatibility shims',
  description:
    'Single repo, single install, but version gaps are dramatic (v1 deployed vs v200 on Packmind). Catches numeric column truncation.',
  owner: SPACES.security,
  installLocations: [loc(STRESS_REPOS.legacy, T.default)],
  artifacts: [
    stressArt('s-gap-1', 'standard', 'big-version-jump-standard', 200, [
      install(STRESS_REPOS.legacy, T.default, 1, '3 years ago'),
    ]),
    stressArt('s-gap-2', 'command', 'big-version-jump-command', 142, [
      install(STRESS_REPOS.legacy, T.default, 1, '3 years ago'),
    ]),
  ],
};

const STRESS_ALIGNED_IN_BIG: PackageDrift = {
  id: 'pkg-stress-aligned-among-many',
  name: 'Calm one (lots of installs, zero drift)',
  description:
    'Many install locations, all aligned. Tests the empty-drift footer-CTA hidden state and the aligned-block layout.',
  owner: SPACES.security,
  installLocations: [
    loc(REPOS.webapp, T.default),
    loc(REPOS.admin, T.default),
    loc(REPOS.marketing, T.default),
    loc(REPOS.mobile, T.default),
    loc(REPOS.paymentsApi, T.default),
    loc(REPOS.identityApi, T.default),
    loc(REPOS.searchApi, T.default),
    loc(REPOS.notif, T.default),
    loc(REPOS.jobsRunner, T.default),
    loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsApi),
    loc(STRESS_REPOS.bigMono, STRESS_TARGETS.appsAdmin),
    loc(STRESS_REPOS.bigMono, STRESS_TARGETS.pkgShared),
  ],
  artifacts: [
    stressArt('s-quiet-1', 'standard', 'all-clear-rule', 3, [
      install(REPOS.webapp, T.default, 3, '1 day ago'),
      install(REPOS.admin, T.default, 3, '1 day ago'),
      install(REPOS.marketing, T.default, 3, '1 day ago'),
      install(REPOS.mobile, T.default, 3, '1 day ago'),
      install(REPOS.paymentsApi, T.default, 3, '1 day ago'),
      install(REPOS.identityApi, T.default, 3, '1 day ago'),
      install(REPOS.searchApi, T.default, 3, '1 day ago'),
      install(REPOS.notif, T.default, 3, '1 day ago'),
      install(REPOS.jobsRunner, T.default, 3, '1 day ago'),
      install(STRESS_REPOS.bigMono, STRESS_TARGETS.appsApi, 3, '1 day ago'),
      install(STRESS_REPOS.bigMono, STRESS_TARGETS.appsAdmin, 3, '1 day ago'),
      install(STRESS_REPOS.bigMono, STRESS_TARGETS.pkgShared, 3, '1 day ago'),
    ]),
  ],
};

const STRESS_BULK_NAMES: Array<{ name: string; space: Space }> = [
  { name: 'API design conventions', space: SPACES.platform },
  { name: 'Authentication patterns', space: SPACES.security },
  { name: 'Background job retry policy', space: SPACES.platform },
  { name: 'Boundary value validation', space: SPACES.platform },
  { name: 'Build and CI hygiene', space: SPACES.platform },
  { name: 'Caching tiers and invalidation', space: SPACES.platform },
  { name: 'Changelog discipline', space: SPACES.designSystem },
  { name: 'Cloud cost guardrails', space: SPACES.platform },
  { name: 'Component naming', space: SPACES.frontend },
  { name: 'Cookie and storage policy', space: SPACES.security },
  { name: 'Cross-team API contracts', space: SPACES.platform },
  { name: 'Cypress smoke flows', space: SPACES.frontend },
  { name: 'Database migration rules', space: SPACES.data },
  { name: 'Dead-letter queue handling', space: SPACES.platform },
  { name: 'Documentation tone', space: SPACES.designSystem },
  { name: 'Email template patterns', space: SPACES.frontend },
  { name: 'Error boundary placement', space: SPACES.frontend },
  { name: 'Feature flag lifecycle', space: SPACES.platform },
  { name: 'Form validation rules', space: SPACES.frontend },
  { name: 'GraphQL schema hygiene', space: SPACES.platform },
  { name: 'i18n string discipline', space: SPACES.frontend },
  { name: 'Incident postmortem template', space: SPACES.platform },
  { name: 'Integration test fixtures', space: SPACES.platform },
  { name: 'JSON Schema authoring', space: SPACES.platform },
  { name: 'Loading state choreography', space: SPACES.frontend },
  { name: 'Mobile gesture patterns', space: SPACES.frontend },
  { name: 'Notification batching', space: SPACES.platform },
  { name: 'Onboarding flow standards', space: SPACES.frontend },
  { name: 'Permission check helpers', space: SPACES.security },
  { name: 'PII handling in logs', space: SPACES.security },
  { name: 'Pull request review checklist', space: SPACES.platform },
  { name: 'Queue depth alerting', space: SPACES.platform },
  { name: 'Rate limit conventions', space: SPACES.platform },
  { name: 'React Query patterns', space: SPACES.frontend },
  { name: 'Release notes formatting', space: SPACES.designSystem },
  { name: 'Search relevance tuning', space: SPACES.data },
  { name: 'SQL query review', space: SPACES.data },
  { name: 'Telemetry event naming', space: SPACES.platform },
  { name: 'Token rotation playbook', space: SPACES.security },
  { name: 'Webhook signature verification', space: SPACES.security },
];

function buildStressBulkPackages(): PackageDrift[] {
  const repos = [
    REPOS.webapp,
    REPOS.admin,
    REPOS.marketing,
    REPOS.paymentsApi,
    REPOS.identityApi,
    REPOS.searchApi,
    REPOS.notif,
    REPOS.jobsRunner,
  ];
  return STRESS_BULK_NAMES.map((entry, idx) => {
    const installCount = 2 + (idx % 4);
    const locations = Array.from({ length: installCount }, (_, j) =>
      loc(repos[(idx + j) % repos.length], T.default),
    );
    const isAligned = idx % 4 === 0;
    const packmindVersion = 2 + (idx % 6);
    const artifactCount = 1 + (idx % 3);
    const ages = [
      '2 days ago',
      '1 week ago',
      '3 weeks ago',
      '2 months ago',
      '5 months ago',
    ];
    const artifacts = Array.from({ length: artifactCount }, (_, ai) =>
      stressArt(
        `s-bulk-${idx}-${ai}`,
        ai % 3 === 0 ? 'standard' : ai % 3 === 1 ? 'command' : 'skill',
        `${entry.name.toLowerCase().replace(/[^a-z]+/g, '-')}-rule-${ai + 1}`,
        packmindVersion,
        locations.map((location, li) => {
          const deployed = isAligned
            ? packmindVersion
            : Math.max(
                1,
                packmindVersion - (((idx * 3 + li * 5 + ai) % 4) + 1),
              );
          return {
            repo: location.repo,
            target: location.target,
            branch: location.branch,
            deployedVersion: deployed,
            lastDeployedAt: ages[(idx + li + ai) % ages.length],
          };
        }),
      ),
    );
    return {
      id: `pkg-stress-bulk-${idx}`,
      name: entry.name,
      description: `Stress filler package #${idx + 1} — used to push the rail past its viewport so scrolling, sticky headers, and filter behaviors get exercised.`,
      owner: entry.space,
      installLocations: locations,
      artifacts,
    };
  });
}

const STRESS_BULK_PACKAGES: PackageDrift[] = buildStressBulkPackages();

const STRESS_PACKAGES: PackageDrift[] = [
  STRESS_MEGA,
  STRESS_LONG_NAMES,
  STRESS_BIG_GAPS,
  STRESS_TINY,
  STRESS_ALIGNED_IN_BIG,
  ...STRESS_BULK_PACKAGES,
];

export function packagesForScenario(scenario: Scenario): PackageDrift[] {
  if (scenario === 'aligned') return ALIGNED_PACKAGES;
  if (scenario === 'heavy') return HEAVY_PACKAGES;
  if (scenario === 'stress') return STRESS_PACKAGES;
  return DEFAULT_PACKAGES;
}

export function isInstallBehind(
  install: RepoInstall,
  packmindVersion: number,
): boolean {
  return install.deployedVersion < packmindVersion;
}

export function artifactBehindCount(art: ArtifactDrift): number {
  return art.installs.filter((i) => isInstallBehind(i, art.packmindVersion))
    .length;
}

function locationKey(repoId: string, targetId: string): string {
  return `${repoId}::${targetId}`;
}

export function packageBehindInstallCount(pkg: PackageDrift): number {
  const behind = new Set<string>();
  pkg.artifacts.forEach((art) => {
    art.installs.forEach((i) => {
      if (isInstallBehind(i, art.packmindVersion)) {
        behind.add(locationKey(i.repo.id, i.target.id));
      }
    });
  });
  return behind.size;
}

export function packageHasDrift(pkg: PackageDrift): boolean {
  return pkg.artifacts.some((a) => artifactBehindCount(a) > 0);
}

export function totalDriftItems(packages: PackageDrift[]): number {
  let count = 0;
  for (const pkg of packages) {
    for (const art of pkg.artifacts) {
      count += artifactBehindCount(art);
    }
  }
  return count;
}

export type InstallDriftEntry = {
  repo: RepoRef;
  target: Target;
  branch: string;
  mostRecentDeployedAt: string | null;
  mostRecentDeployedAtDays: number;
  behindArtifacts: Array<{
    artifact: ArtifactDrift;
    deployedVersion: number;
    lastDeployedAt: string;
  }>;
  alignedArtifactCount: number;
};

export function installDriftEntries(pkg: PackageDrift): InstallDriftEntry[] {
  const byLocation = new Map<string, InstallDriftEntry>();
  for (const location of pkg.installLocations) {
    byLocation.set(locationKey(location.repo.id, location.target.id), {
      repo: location.repo,
      target: location.target,
      branch: location.branch,
      mostRecentDeployedAt: null,
      mostRecentDeployedAtDays: Number.POSITIVE_INFINITY,
      behindArtifacts: [],
      alignedArtifactCount: 0,
    });
  }
  for (const artifact of pkg.artifacts) {
    for (const inst of artifact.installs) {
      const entry = byLocation.get(locationKey(inst.repo.id, inst.target.id));
      if (!entry) continue;
      const days = relativeDaysAgo(inst.lastDeployedAt);
      if (days < entry.mostRecentDeployedAtDays) {
        entry.mostRecentDeployedAtDays = days;
        entry.mostRecentDeployedAt = inst.lastDeployedAt;
      }
      if (isInstallBehind(inst, artifact.packmindVersion)) {
        entry.behindArtifacts.push({
          artifact,
          deployedVersion: inst.deployedVersion,
          lastDeployedAt: inst.lastDeployedAt,
        });
      } else {
        entry.alignedArtifactCount += 1;
      }
    }
  }

  const entries = Array.from(byLocation.values());
  const drifted: InstallDriftEntry[] = [];
  const aligned: InstallDriftEntry[] = [];
  for (const entry of entries) {
    if (entry.behindArtifacts.length > 0) drifted.push(entry);
    else aligned.push(entry);
  }

  const driftedRepoMaxBehind = new Map<string, number>();
  for (const entry of drifted) {
    const current = driftedRepoMaxBehind.get(entry.repo.id) ?? 0;
    if (entry.behindArtifacts.length > current) {
      driftedRepoMaxBehind.set(entry.repo.id, entry.behindArtifacts.length);
    }
  }

  const cmpRepo = (a: InstallDriftEntry, b: InstallDriftEntry) =>
    (a.repo.owner + a.repo.name).localeCompare(b.repo.owner + b.repo.name);

  const cmpTarget = (a: InstallDriftEntry, b: InstallDriftEntry) => {
    if (a.target.isDefault && !b.target.isDefault) return -1;
    if (!a.target.isDefault && b.target.isDefault) return 1;
    return a.target.name.localeCompare(b.target.name);
  };

  drifted.sort((a, b) => {
    const aRepoMax = driftedRepoMaxBehind.get(a.repo.id) ?? 0;
    const bRepoMax = driftedRepoMaxBehind.get(b.repo.id) ?? 0;
    if (aRepoMax !== bRepoMax) return bRepoMax - aRepoMax;
    const repoCmp = cmpRepo(a, b);
    if (repoCmp !== 0) return repoCmp;
    const aBehind = a.behindArtifacts.length;
    const bBehind = b.behindArtifacts.length;
    if (aBehind !== bBehind) return bBehind - aBehind;
    return cmpTarget(a, b);
  });

  aligned.sort((a, b) => {
    const repoCmp = cmpRepo(a, b);
    if (repoCmp !== 0) return repoCmp;
    return cmpTarget(a, b);
  });

  return [...drifted, ...aligned];
}

export function sortPackagesByDriftFirst(
  packages: PackageDrift[],
): PackageDrift[] {
  return [...packages].sort((a, b) => {
    const ad = packageBehindInstallCount(a);
    const bd = packageBehindInstallCount(b);
    if (ad !== bd) return bd - ad;
    return a.name.localeCompare(b.name);
  });
}

export function packageMostRecentPush(
  pkg: PackageDrift,
): { label: string; days: number } | null {
  let best: { label: string; days: number } | null = null;
  for (const art of pkg.artifacts) {
    for (const inst of art.installs) {
      const days = relativeDaysAgo(inst.lastDeployedAt);
      if (!best || days < best.days) {
        best = { label: inst.lastDeployedAt, days };
      }
    }
  }
  return best;
}

export function totalBehindInstallCount(packages: PackageDrift[]): number {
  let count = 0;
  for (const pkg of packages) {
    count += packageBehindInstallCount(pkg);
  }
  return count;
}

export type ArtifactDriftSource = {
  artifact: ArtifactDrift;
  behindCount: number;
};

export function topDriftSources(
  pkg: PackageDrift,
  limit = 3,
): ArtifactDriftSource[] {
  return pkg.artifacts
    .map((artifact) => ({
      artifact,
      behindCount: artifactBehindCount(artifact),
    }))
    .filter((s) => s.behindCount > 0)
    .sort((a, b) => {
      if (a.behindCount !== b.behindCount) return b.behindCount - a.behindCount;
      return a.artifact.name.localeCompare(b.artifact.name);
    })
    .slice(0, limit);
}
