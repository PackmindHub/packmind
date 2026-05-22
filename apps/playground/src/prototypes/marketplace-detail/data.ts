import type { Installer, MarketplaceDetail, Space } from './types';

const SPACES: Record<string, Space> = {
  frontendGuild: { id: 'frontend-guild', name: 'Frontend guild' },
  platform: { id: 'platform', name: 'Platform' },
  security: { id: 'security', name: 'Security' },
  designSystem: { id: 'design-system', name: 'Design system' },
  dataPlatform: { id: 'data-platform', name: 'Data platform' },
};

const INSTALLERS: Record<string, Installer> = {
  sara: { name: 'Sara Pham', initials: 'SP' },
  marc: { name: 'Marc Reed', initials: 'MR' },
  anil: { name: 'Anil Verma', initials: 'AV' },
  ines: { name: 'Ines Costa', initials: 'IC' },
  jonas: { name: 'Jonas Holm', initials: 'JH' },
  ravi: { name: 'Ravi Singh', initials: 'RS' },
  maya: { name: 'Maya Levin', initials: 'ML' },
  olu: { name: 'Olu Adebayo', initials: 'OA' },
  karim: { name: 'Karim Tahir', initials: 'KT' },
  lena: { name: 'Lena Brandt', initials: 'LB' },
};

export const STUB_MARKETPLACE: MarketplaceDetail = {
  id: 'frontend',
  name: 'Frontend playbook',
  repoPath: 'acme/frontend-marketplace',
  remoteUrl: 'git@github.com:acme/frontend-marketplace.git',
  agents: ['Claude Code', 'Copilot'],
  lastPublishedRelative: '2d ago',
  state: 'drift',
  consumers: {
    repoCount: 47,
    outdatedRepos: 5,
  },
  plugins: [
    {
      id: 'frontend-react-rules',
      name: 'React conventions',
      packageSlug: 'acme/frontend-react-rules',
      version: '3.2.1',
      mandatory: true,
      owner: SPACES.frontendGuild,
      description:
        'React component conventions and hooks discipline for the customer-facing apps. Covers file layout, state ownership, and the rules around effects we keep relearning.',
      lastPublishedRelative: '2d ago',
      state: 'healthy',
      sourceSync: {
        state: 'behind',
        sourceVersion: '3.3.0',
        changes: [
          {
            kind: 'added',
            target: 'Suspense boundaries',
            artifactKind: 'standard',
          },
          {
            kind: 'updated',
            target: 'Effects and cleanup',
            artifactKind: 'standard',
          },
          {
            kind: 'updated',
            target: '/review-component',
            artifactKind: 'command',
          },
        ],
      },
      adoption: {
        reposOnVersion: 38,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/web-portal',
            installedVersion: '3.2.1',
            installer: INSTALLERS.sara,
            installedRelative: '2d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-portal',
            installedVersion: '3.2.1',
            installer: INSTALLERS.marc,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/admin-dash',
            installedVersion: '3.2.1',
            installer: INSTALLERS.ines,
            installedRelative: '5d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/cms-frontend',
            installedVersion: '3.2.1',
            installer: INSTALLERS.jonas,
            installedRelative: '6d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/marketing-site',
            installedVersion: '3.2.1',
            installer: INSTALLERS.maya,
            installedRelative: '9d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: [
        {
          id: 'a1',
          kind: 'standard',
          name: 'useState hooks discipline',
          summary:
            'When to lift state, when to colocate, and the cases where useReducer earns its keep.',
        },
        {
          id: 'a2',
          kind: 'standard',
          name: 'Component file structure',
          summary:
            'One component per file, named exports, colocated tests and styles.',
        },
        {
          id: 'a3',
          kind: 'standard',
          name: 'Props ergonomics',
          summary:
            'Readonly props, discriminated unions over boolean flags, sane defaults.',
        },
        {
          id: 'a4',
          kind: 'standard',
          name: 'Effects and cleanup',
          summary:
            'Avoid effects when a derived value works. Always cancel async work on unmount.',
        },
        {
          id: 'a5',
          kind: 'command',
          name: '/scaffold-component',
          summary:
            'Generate a typed component with the agreed file layout and a Storybook entry.',
        },
        {
          id: 'a6',
          kind: 'command',
          name: '/review-component',
          summary:
            'Run the agent over a component diff against the rules above.',
        },
        {
          id: 'a7',
          kind: 'skill',
          name: 'working-with-pm-design-kit',
          summary:
            'Prefer PM* primitives from @packmind/ui before reaching for raw Chakra.',
        },
      ],
    },
    {
      id: 'data-platform-sql',
      name: 'SQL conventions',
      packageSlug: 'acme/data-platform-sql',
      version: '1.4.0',
      mandatory: false,
      owner: SPACES.dataPlatform,
      description:
        'SQL conventions and query review checklist for analytics work hitting the data warehouse.',
      lastPublishedRelative: '11d ago',
      state: 'drift',
      sourceSync: {
        state: 'in-sync',
        sourceVersion: '1.4.0',
      },
      adoption: {
        reposOnVersion: 12,
        outdatedRepos: 7,
        repos: [
          {
            repoPath: 'acme/billing-events',
            installedVersion: '1.3.0',
            installer: INSTALLERS.sara,
            installedRelative: '11d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/analytics-svc',
            installedVersion: '1.3.0',
            installer: INSTALLERS.marc,
            installedRelative: '8d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/reporting-svc',
            installedVersion: '1.2.5',
            installer: INSTALLERS.anil,
            installedRelative: '22d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/data-ingest',
            installedVersion: '1.2.5',
            installer: INSTALLERS.ines,
            installedRelative: '24d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/customer-events',
            installedVersion: '1.2.0',
            installer: INSTALLERS.jonas,
            installedRelative: '32d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/etl-pipelines',
            installedVersion: '1.1.0',
            installer: INSTALLERS.ravi,
            installedRelative: '47d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/data-warehouse-tools',
            installedVersion: '1.0.2',
            installer: INSTALLERS.maya,
            installedRelative: '64d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/order-stream',
            installedVersion: '1.4.0',
            installer: INSTALLERS.olu,
            installedRelative: '2d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/forecast-svc',
            installedVersion: '1.4.0',
            installer: INSTALLERS.karim,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/cohort-svc',
            installedVersion: '1.4.0',
            installer: INSTALLERS.lena,
            installedRelative: '5d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/payments-events',
            installedVersion: '1.4.0',
            installer: INSTALLERS.sara,
            installedRelative: '7d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/inventory-events',
            installedVersion: '1.4.0',
            installer: INSTALLERS.marc,
            installedRelative: '10d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: [
        {
          id: 'b1',
          kind: 'standard',
          name: 'CTE over subquery',
          summary:
            'Default to named CTEs. Subqueries hide intent in long pipelines.',
        },
        {
          id: 'b2',
          kind: 'standard',
          name: 'Naming and casing',
          summary:
            'snake_case identifiers, no reserved words, no abbreviations beyond the agreed list.',
        },
        {
          id: 'b3',
          kind: 'standard',
          name: 'Window functions etiquette',
          summary:
            'Partition keys are explicit. No implicit ordering. Always alias.',
        },
        {
          id: 'b4',
          kind: 'command',
          name: '/explain-plan',
          summary:
            'Wrap a query in EXPLAIN ANALYZE and surface the expensive nodes.',
        },
      ],
    },
    {
      id: 'security-baseline',
      name: 'Security baseline',
      packageSlug: 'acme/security-baseline',
      version: '2.0.0',
      mandatory: true,
      owner: SPACES.security,
      description:
        'Baseline secure-coding rules for all production services. Reviewed by the Security guild every quarter.',
      lastPublishedRelative: '3h ago',
      state: 'healthy',
      sourceSync: {
        state: 'in-sync',
        sourceVersion: '2.0.0',
      },
      adoption: {
        reposOnVersion: 47,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/auth-svc',
            installedVersion: '2.0.0',
            installer: INSTALLERS.ravi,
            installedRelative: '3h ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/billing-api',
            installedVersion: '2.0.0',
            installer: INSTALLERS.sara,
            installedRelative: '6h ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/orders-svc',
            installedVersion: '2.0.0',
            installer: INSTALLERS.marc,
            installedRelative: '1d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-svc',
            installedVersion: '2.0.0',
            installer: INSTALLERS.ines,
            installedRelative: '1d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/notifier',
            installedVersion: '2.0.0',
            installer: INSTALLERS.olu,
            installedRelative: '2d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: [
        {
          id: 'c1',
          kind: 'standard',
          name: 'Secrets retrieval',
          summary:
            'Always go through Configuration.getConfig(). Never read process.env in feature code.',
        },
        {
          id: 'c2',
          kind: 'standard',
          name: 'Personal data in logs',
          summary:
            'Mask emails, phone numbers, IPs, and identifiers before logging.',
        },
        {
          id: 'c3',
          kind: 'standard',
          name: 'Input validation at boundaries',
          summary:
            'Validate at the system edge (HTTP, queue consumers). Trust internal callers.',
        },
        {
          id: 'c4',
          kind: 'command',
          name: '/audit-secrets',
          summary:
            'Scan the diff for hardcoded credentials before opening a PR.',
        },
      ],
    },
    {
      id: 'design-tokens',
      name: 'Design tokens',
      packageSlug: 'acme/design-tokens',
      version: '0.9.3',
      mandatory: false,
      owner: SPACES.designSystem,
      description:
        'Tokens, semantic colors, and spacing scale used by the design system. Keep this in sync with the Figma library.',
      lastPublishedRelative: '9d ago',
      state: 'healthy',
      sourceSync: {
        state: 'behind',
        sourceVersion: '0.9.4',
        changes: [
          {
            kind: 'updated',
            target: 'Color usage',
            artifactKind: 'standard',
          },
          {
            kind: 'added',
            target: 'curate-design-tokens',
            artifactKind: 'skill',
          },
        ],
      },
      adoption: {
        reposOnVersion: 21,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/web-portal',
            installedVersion: '0.9.3',
            installer: INSTALLERS.maya,
            installedRelative: '4d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-portal',
            installedVersion: '0.9.3',
            installer: INSTALLERS.jonas,
            installedRelative: '4d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/admin-dash',
            installedVersion: '0.9.3',
            installer: INSTALLERS.lena,
            installedRelative: '6d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/cms-frontend',
            installedVersion: '0.9.3',
            installer: INSTALLERS.karim,
            installedRelative: '8d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/marketing-site',
            installedVersion: '0.9.3',
            installer: INSTALLERS.sara,
            installedRelative: '9d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: [
        {
          id: 'd1',
          kind: 'standard',
          name: 'Color usage',
          summary:
            'Reserve the periwinkle accent for primary affordance and focus only.',
        },
        {
          id: 'd2',
          kind: 'standard',
          name: 'Spacing scale',
          summary:
            'xs / sm / md / lg / xl / 2xl. Do not improvise intermediate values.',
        },
        {
          id: 'd3',
          kind: 'skill',
          name: 'impeccable-polish',
          summary:
            'Final pass to fix alignment, spacing, and inconsistency before merging UI work.',
        },
      ],
    },
    {
      id: 'platform-typescript',
      name: 'TypeScript rules',
      packageSlug: 'acme/platform-typescript',
      version: '4.1.0',
      mandatory: true,
      owner: SPACES.platform,
      description:
        'TypeScript conventions enforced across all platform services and shared packages.',
      lastPublishedRelative: '5d ago',
      state: 'healthy',
      sourceSync: {
        state: 'in-sync',
        sourceVersion: '4.1.0',
      },
      adoption: {
        reposOnVersion: 47,
        outdatedRepos: 0,
        repos: [
          {
            repoPath: 'acme/auth-svc',
            installedVersion: '4.1.0',
            installer: INSTALLERS.ravi,
            installedRelative: '2d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/billing-api',
            installedVersion: '4.1.0',
            installer: INSTALLERS.anil,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/orders-svc',
            installedVersion: '4.1.0',
            installer: INSTALLERS.olu,
            installedRelative: '3d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/inventory-svc',
            installedVersion: '4.1.0',
            installer: INSTALLERS.karim,
            installedRelative: '4d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/notifier',
            installedVersion: '4.1.0',
            installer: INSTALLERS.lena,
            installedRelative: '5d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: [
        {
          id: 'e1',
          kind: 'standard',
          name: 'Strict null handling',
          summary:
            'strictNullChecks on. Prefer narrow types over runtime guards.',
        },
        {
          id: 'e2',
          kind: 'standard',
          name: 'Error classes',
          summary:
            'Extend Error directly. Do not use Object.setPrototypeOf in custom errors.',
        },
        {
          id: 'e3',
          kind: 'standard',
          name: 'Presentation DTOs',
          summary:
            'Use DomainType & { extraField } intersection, not field re-declaration.',
        },
        {
          id: 'e4',
          kind: 'command',
          name: '/typecheck-affected',
          summary: 'Run tsc only on the affected projects in the Nx graph.',
        },
      ],
    },
    {
      id: 'testing-conventions',
      name: 'Testing conventions',
      packageSlug: 'acme/testing-conventions',
      version: '1.2.0',
      mandatory: false,
      owner: SPACES.platform,
      description:
        'Test layout, naming, and the boundary between unit and integration tests.',
      lastPublishedRelative: '14d ago',
      state: 'drift',
      sourceSync: {
        state: 'behind',
        sourceVersion: '1.3.0',
        changes: [
          {
            kind: 'added',
            target: 'Snapshot tests etiquette',
            artifactKind: 'standard',
          },
          {
            kind: 'updated',
            target: 'Factories over fixtures',
            artifactKind: 'standard',
          },
        ],
      },
      adoption: {
        reposOnVersion: 30,
        outdatedRepos: 4,
        repos: [
          {
            repoPath: 'acme/legacy-billing',
            installedVersion: '1.1.0',
            installer: INSTALLERS.jonas,
            installedRelative: '32d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/internal-tools',
            installedVersion: '1.1.0',
            installer: INSTALLERS.maya,
            installedRelative: '40d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/cron-runner',
            installedVersion: '1.0.4',
            installer: INSTALLERS.karim,
            installedRelative: '52d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/search-svc',
            installedVersion: '1.0.4',
            installer: INSTALLERS.lena,
            installedRelative: '58d ago',
            isOutdated: true,
          },
          {
            repoPath: 'acme/auth-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.ravi,
            installedRelative: '5d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/billing-api',
            installedVersion: '1.2.0',
            installer: INSTALLERS.sara,
            installedRelative: '6d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/orders-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.marc,
            installedRelative: '8d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/customer-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.ines,
            installedRelative: '11d ago',
            isOutdated: false,
          },
          {
            repoPath: 'acme/checkout-svc',
            installedVersion: '1.2.0',
            installer: INSTALLERS.olu,
            installedRelative: '14d ago',
            isOutdated: false,
          },
        ],
      },
      artifacts: [
        {
          id: 'f1',
          kind: 'standard',
          name: 'AAA layout',
          summary:
            'Arrange, Act, Assert blocks separated by a blank line. One assertion per concept.',
        },
        {
          id: 'f2',
          kind: 'standard',
          name: 'Factories over fixtures',
          summary:
            'Build test data through factory functions with named overrides.',
        },
        {
          id: 'f3',
          kind: 'standard',
          name: 'Integration tests hit a real DB',
          summary:
            'No mocked database. Prior incident: mocked migrations passed, prod broke.',
        },
      ],
    },
  ],
};

export const EMPTY_MARKETPLACE: MarketplaceDetail = {
  id: 'fresh',
  name: 'Mobile guild',
  repoPath: 'acme/mobile-marketplace',
  remoteUrl: 'git@github.com:acme/mobile-marketplace.git',
  agents: ['Claude Code', 'Copilot'],
  lastPublishedRelative: 'never',
  state: 'healthy',
  consumers: { repoCount: 0, outdatedRepos: 0 },
  plugins: [],
};
