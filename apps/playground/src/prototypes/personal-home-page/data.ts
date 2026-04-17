import type { SpaceWithPendingReviews, Tip } from './types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) =>
  new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

// ── Spaces with pending reviews ─────────────────────────────────────────────
// Sorted by oldest proposal first (urgency-driven)

export const STUB_SPACES_WITH_REVIEWS: SpaceWithPendingReviews[] = [
  {
    id: 'sp-backend',
    name: 'Backend',
    color: '#6366f1',
    pendingProposals: [
      {
        id: 'pr-1',
        artefactType: 'standard',
        artefactName: 'API naming conventions',
        action: 'addRule',
        message: 'Add rule: "Use kebab-case for REST endpoints"',
        authorName: 'Alex Martin',
        createdAt: daysAgo(5),
      },
      {
        id: 'pr-2',
        artefactType: 'standard',
        artefactName: 'Error handling',
        action: 'updateRule',
        message: 'Clarify retry policy for transient failures',
        authorName: 'Sarah Chen',
        createdAt: daysAgo(2),
      },
    ],
  },
  {
    id: 'sp-frontend',
    name: 'Frontend Engineering',
    color: '#f59e0b',
    pendingProposals: [
      {
        id: 'pr-3',
        artefactType: 'command',
        artefactName: 'Component scaffolding',
        action: 'create',
        message: 'New command to generate component with tests and stories',
        authorName: 'Jordan Lee',
        createdAt: daysAgo(3),
      },
    ],
  },
  {
    id: 'sp-security',
    name: 'Security & Compliance',
    color: '#ef4444',
    pendingProposals: [
      {
        id: 'pr-4',
        artefactType: 'standard',
        artefactName: 'Authentication patterns',
        action: 'updateDescription',
        message: 'Update scope to include OAuth2 PKCE flow',
        authorName: 'Alex Martin',
        createdAt: hoursAgo(4),
      },
      {
        id: 'pr-5',
        artefactType: 'skill',
        artefactName: 'Vulnerability scanner integration',
        action: 'addFile',
        message: 'Add OWASP top-10 checklist template',
        authorName: 'Pat Kumar',
        createdAt: hoursAgo(1),
      },
      {
        id: 'pr-6',
        artefactType: 'standard',
        artefactName:
          'Logging personal information — compliance requirements for GDPR',
        action: 'addRule',
        message: 'Add rule: "Mask PII in all structured log fields"',
        authorName: 'Sarah Chen',
        createdAt: daysAgo(1),
      },
    ],
  },
  {
    id: 'sp-platform',
    name: 'Platform & Infrastructure',
    color: '#14b8a6',
    pendingProposals: [
      {
        id: 'pr-7',
        artefactType: 'command',
        artefactName: 'Deploy to staging',
        action: 'updateName',
        message: 'Rename to "Deploy to staging environment"',
        authorName: 'Jordan Lee',
        createdAt: hoursAgo(6),
      },
    ],
  },
];

// ── Tips for the discovery module ───────────────────────────────────────────

export const STUB_TIPS: Tip[] = [
  {
    id: 'tip-1',
    title: 'Pin your most-used spaces',
    description:
      'Pinned spaces appear at the top of your sidebar for quick access. Right-click any space to pin it.',
    actionLabel: 'Go to spaces',
  },
  {
    id: 'tip-2',
    title: 'Create a command for repetitive tasks',
    description:
      'Commands let you capture multi-step workflows your team runs often — like deploying or scaffolding new modules.',
    actionLabel: 'Learn about commands',
  },
  {
    id: 'tip-3',
    title: 'Standards work best with examples',
    description:
      'Adding code examples to your rules makes them clearer for both humans and AI assistants.',
    actionLabel: 'See best practices',
  },
];
