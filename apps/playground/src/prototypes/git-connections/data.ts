import type { CliManagedEntry, UserConnection } from './types';

export const STUB_CONNECTIONS: UserConnection[] = [
  {
    id: 'cnx_001',
    vendor: 'github',
    authMethod: 'app',
    displayName: 'Production marketplace',
    identifier: 'github.com/acme-engineering',
    status: 'connected',
    lastPushAt: '2026-06-02T08:14:00Z',
    lastCheckedAt: '2026-06-02T11:42:00Z',
    installedBy: 'Maya Okafor',
    installedAt: '2025-11-04',
    repos: [
      {
        id: 'r_001',
        path: 'acme-engineering/marketplace',
        branch: 'main',
        defaultBranch: 'main',
      },
      {
        id: 'r_002',
        path: 'acme-engineering/standards-public',
        branch: 'main',
        defaultBranch: 'main',
        duplicatedIn: ['cnx_002'],
      },
      {
        id: 'r_003',
        path: 'acme-engineering/recipes-public',
        branch: 'main',
        defaultBranch: 'main',
      },
      {
        id: 'r_004',
        path: 'acme-engineering/skills-public',
        branch: 'release/2026.06',
        defaultBranch: 'main',
      },
    ],
    availableRepos: [
      {
        id: 'r_001',
        path: 'acme-engineering/marketplace',
        defaultBranch: 'main',
      },
      {
        id: 'r_002',
        path: 'acme-engineering/standards-public',
        defaultBranch: 'main',
      },
      {
        id: 'r_003',
        path: 'acme-engineering/recipes-public',
        defaultBranch: 'main',
      },
      {
        id: 'r_004',
        path: 'acme-engineering/skills-public',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_001',
        path: 'acme-engineering/api-gateway',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_002',
        path: 'acme-engineering/web-frontend',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_003',
        path: 'acme-engineering/agent-tools',
        defaultBranch: 'develop',
      },
      {
        id: 'r_avail_004',
        path: 'acme-engineering/infra-terraform',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_005',
        path: 'acme-engineering/docs-internal',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_006',
        path: 'acme-engineering/legacy-monolith',
        defaultBranch: 'master',
      },
    ],
  },
  {
    id: 'cnx_002',
    vendor: 'github',
    authMethod: 'app',
    displayName: '',
    identifier: 'github.com/acme-sandbox',
    status: 'connected',
    lastPushAt: '2026-05-19T16:22:00Z',
    lastCheckedAt: '2026-06-02T11:42:00Z',
    installedBy: 'Maya Okafor',
    installedAt: '2026-02-11',
    repos: [
      {
        id: 'r_005',
        path: 'acme-engineering/standards-public',
        branch: 'main',
        defaultBranch: 'main',
        duplicatedIn: ['cnx_001'],
      },
      {
        id: 'r_006',
        path: 'acme-sandbox/playground',
        branch: 'main',
        defaultBranch: 'main',
      },
    ],
    availableRepos: [
      {
        id: 'r_005',
        path: 'acme-engineering/standards-public',
        defaultBranch: 'main',
      },
      { id: 'r_006', path: 'acme-sandbox/playground', defaultBranch: 'main' },
      {
        id: 'r_avail_007',
        path: 'acme-sandbox/experiments',
        defaultBranch: 'main',
      },
    ],
  },
  {
    id: 'cnx_003',
    vendor: 'gitlab',
    authMethod: 'pat',
    displayName: 'Internal mirror',
    identifier: 'gitlab.acme.internal/platform',
    status: 'token_expired',
    statusDetail:
      'PAT expired on 2026-05-28. Rotate the token to restore publishing.',
    lastPushAt: '2026-04-30T09:08:00Z',
    lastCheckedAt: '2026-06-02T11:42:00Z',
    installedBy: 'Jules Tan',
    installedAt: '2025-09-01',
    repos: [
      {
        id: 'r_007',
        path: 'platform/standards-internal',
        branch: 'main',
        defaultBranch: 'main',
      },
      {
        id: 'r_008',
        path: 'platform/recipes-internal',
        branch: 'main',
        defaultBranch: 'main',
      },
    ],
    availableRepos: [
      {
        id: 'r_007',
        path: 'platform/standards-internal',
        defaultBranch: 'main',
      },
      { id: 'r_008', path: 'platform/recipes-internal', defaultBranch: 'main' },
      {
        id: 'r_avail_008',
        path: 'platform/skills-internal',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_009',
        path: 'platform/observability',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_010',
        path: 'platform/telemetry-sdks',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_011',
        path: 'platform/scheduling-service',
        defaultBranch: 'main',
      },
    ],
  },
  {
    id: 'cnx_004',
    vendor: 'github',
    authMethod: 'pat',
    displayName: 'Recipes-only fallback',
    identifier: 'github.com/acme-engineering',
    status: 'unreachable',
    statusDetail:
      'Vendor returned 502 Bad Gateway at 11:31. Will retry automatically; you can also refresh now.',
    lastPushAt: null,
    lastCheckedAt: '2026-06-02T11:31:00Z',
    installedBy: 'Rin Kobayashi',
    installedAt: '2026-05-22',
    repos: [
      {
        id: 'r_009',
        path: 'acme-engineering/recipes-fallback',
        branch: 'main',
        defaultBranch: 'main',
      },
    ],
    availableRepos: [
      {
        id: 'r_009',
        path: 'acme-engineering/recipes-fallback',
        defaultBranch: 'main',
      },
      {
        id: 'r_avail_012',
        path: 'acme-engineering/recipes-public',
        defaultBranch: 'main',
      },
    ],
  },
];

export const STUB_CLI_ENTRIES: CliManagedEntry[] = [
  {
    id: 'cli_001',
    vendor: 'github',
    instance: 'github.com',
    repoPath: 'acme-engineering/api-gateway',
    createdBy: 'Jamal Whitaker',
    createdByEmailMasked: 'j***@acme.dev',
    createdAt: '2026-05-29',
  },
  {
    id: 'cli_002',
    vendor: 'github',
    instance: 'github.com',
    repoPath: 'acme-engineering/web-frontend',
    createdBy: 'Priya Singh',
    createdByEmailMasked: 'p***@acme.dev',
    createdAt: '2026-05-21',
  },
  {
    id: 'cli_003',
    vendor: 'gitlab',
    instance: 'gitlab.acme.internal',
    repoPath: 'platform/observability',
    createdBy: 'Léa Martin',
    createdByEmailMasked: 'l***@acme.dev',
    createdAt: '2026-04-12',
  },
];
