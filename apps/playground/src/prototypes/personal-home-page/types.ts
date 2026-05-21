// ── Domain types for the Personal Home Page ─────────────────────────────────

export type SpaceId = string;
export type ProposalId = string;
export type UserId = string;

export type ArtefactType = 'standard' | 'command' | 'skill';

export type ProposalAction =
  | 'create'
  | 'remove'
  | 'updateName'
  | 'updateDescription'
  | 'addRule'
  | 'updateRule'
  | 'deleteRule'
  | 'updatePrompt'
  | 'addFile'
  | 'updateFile';

export interface PendingProposal {
  id: ProposalId;
  artefactType: ArtefactType;
  artefactName: string;
  action: ProposalAction;
  message: string;
  authorName: string;
  createdAt: Date;
}

export interface SpaceWithPendingReviews {
  id: SpaceId;
  name: string;
  color: string;
  pendingProposals: PendingProposal[];
}

export interface Tip {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getProposalActionLabel(
  action: ProposalAction,
  artefactType: ArtefactType,
): string {
  switch (action) {
    case 'create':
      return `Create ${artefactType}`;
    case 'remove':
      return `Remove ${artefactType}`;
    case 'updateName':
      return `Rename ${artefactType}`;
    case 'updateDescription':
      return `Update description`;
    case 'addRule':
      return 'Add rule';
    case 'updateRule':
      return 'Update rule';
    case 'deleteRule':
      return 'Delete rule';
    case 'updatePrompt':
      return 'Update prompt';
    case 'addFile':
      return 'Add file';
    case 'updateFile':
      return 'Update file';
  }
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export function getOldestProposalAge(space: SpaceWithPendingReviews): Date {
  return space.pendingProposals.reduce(
    (oldest, p) => (p.createdAt < oldest ? p.createdAt : oldest),
    space.pendingProposals[0].createdAt,
  );
}
