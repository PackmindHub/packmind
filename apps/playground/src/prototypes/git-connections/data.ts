import type { CliManagedEntry, UserConnection } from './types';

export const STUB_CONNECTIONS: UserConnection[] = [
  {
    id: 'cnx_001',
    vendor: 'github',
    displayName: 'Production marketplace',
    identifier: 'github.com/acme-engineering',
    status: 'connected',
    lastPushAt: '2026-06-02T08:14:00Z',
    lastCheckedAt: '2026-06-02T11:42:00Z',
    installedBy: 'Maya Okafor',
    installedAt: '2025-11-04',
    repos: [
      { id: 'r_001', path: 'acme-engineering/marketplace' },
      {
        id: 'r_002',
        path: 'acme-engineering/standards-public',
        duplicatedIn: ['cnx_002'],
      },
      { id: 'r_003', path: 'acme-engineering/recipes-public' },
      { id: 'r_004', path: 'acme-engineering/skills-public' },
    ],
  },
  {
    id: 'cnx_002',
    vendor: 'github',
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
        duplicatedIn: ['cnx_001'],
      },
      { id: 'r_006', path: 'acme-sandbox/playground' },
    ],
  },
  {
    id: 'cnx_003',
    vendor: 'gitlab',
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
      { id: 'r_007', path: 'platform/standards-internal' },
      { id: 'r_008', path: 'platform/recipes-internal' },
    ],
  },
  {
    id: 'cnx_004',
    vendor: 'github',
    displayName: 'Recipes-only fallback',
    identifier: 'github.com/acme-engineering',
    status: 'unreachable',
    statusDetail:
      'Vendor returned 502 Bad Gateway at 11:31. Will retry automatically; you can also refresh now.',
    lastPushAt: null,
    lastCheckedAt: '2026-06-02T11:31:00Z',
    installedBy: 'Rin Kobayashi',
    installedAt: '2026-05-22',
    repos: [{ id: 'r_009', path: 'acme-engineering/recipes-fallback' }],
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
