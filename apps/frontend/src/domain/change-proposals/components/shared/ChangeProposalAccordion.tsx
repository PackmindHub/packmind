import { ReactNode, useMemo, useCallback } from 'react';
import { PMAccordion, PMBox, PMVStack } from '@packmind/ui';
import { ChangeProposalId } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { buildProposalNumberMap } from '../../utils/changeProposalHelpers';
import { ChangesSummaryBar } from './ChangesSummaryBar';
import { ChangeProposalCard } from './ChangeProposalCard';
import { ReviewedSectionDivider } from './ReviewedSectionDivider';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalAccordionProps {
  proposals: ChangeProposalWithConflicts[];
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  outdatedProposalIds: Set<ChangeProposalId>;
  expandedCardIds: string[];
  editingProposalId?: ChangeProposalId | null;
  showEditButton?: boolean;
  userLookup: Map<string, string>;
  onToggleCard: (ids: string[]) => void;
  getViewMode: (proposalId: ChangeProposalId) => ViewMode;
  onViewModeChange: (proposalId: ChangeProposalId, mode: ViewMode) => void;
  onEdit: (proposalId: ChangeProposalId) => void;
  onAccept: (proposalId: ChangeProposalId) => void;
  onDismiss: (proposalId: ChangeProposalId) => void;
  onUndo: (proposalId: ChangeProposalId) => void;
  renderExpandedView?: (
    viewMode: ViewMode,
    proposal: ChangeProposalWithConflicts,
  ) => ReactNode;
}

function getPoolStatus(
  proposalId: ChangeProposalId,
  acceptedIds: Set<ChangeProposalId>,
  rejectedIds: Set<ChangeProposalId>,
): PoolStatus {
  if (acceptedIds.has(proposalId)) return 'accepted';
  if (rejectedIds.has(proposalId)) return 'dismissed';
  return 'pending';
}

export function ChangeProposalAccordion({
  proposals,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  outdatedProposalIds,
  expandedCardIds,
  editingProposalId,
  showEditButton,
  userLookup,
  onToggleCard,
  getViewMode,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  renderExpandedView,
}: Readonly<ChangeProposalAccordionProps>) {
  const proposalNumberMap = useMemo(
    () => buildProposalNumberMap(proposals),
    [proposals],
  );

  const { pending, reviewed } = useMemo(() => {
    const sorted = [...proposals].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const pendingList: ChangeProposalWithConflicts[] = [];
    const reviewedList: ChangeProposalWithConflicts[] = [];
    for (const p of sorted) {
      const status = getPoolStatus(
        p.id,
        acceptedProposalIds,
        rejectedProposalIds,
      );
      if (status === 'pending') {
        pendingList.push(p);
      } else {
        reviewedList.push(p);
      }
    }
    return { pending: pendingList, reviewed: reviewedList };
  }, [proposals, acceptedProposalIds, rejectedProposalIds]);

  const counts = useMemo(
    () => ({
      total: proposals.length,
      pending: pending.length,
      accepted: acceptedProposalIds.size,
      dismissed: rejectedProposalIds.size,
    }),
    [
      proposals.length,
      pending.length,
      acceptedProposalIds.size,
      rejectedProposalIds.size,
    ],
  );

  const handleValueChange = useCallback(
    (details: { value: string[] }) => {
      onToggleCard(details.value);
    },
    [onToggleCard],
  );

  const renderCard = (proposal: ChangeProposalWithConflicts) => {
    const poolStatus = getPoolStatus(
      proposal.id,
      acceptedProposalIds,
      rejectedProposalIds,
    );
    const viewMode = getViewMode(proposal.id);
    const authorName = userLookup.get(proposal.createdBy) ?? 'Unknown';
    const isEditing = editingProposalId === proposal.id;

    return (
      <ChangeProposalCard
        key={proposal.id}
        proposal={proposal}
        proposalNumber={proposalNumberMap.get(proposal.id) ?? 0}
        poolStatus={poolStatus}
        authorName={authorName}
        viewMode={viewMode}
        isOutdated={outdatedProposalIds.has(proposal.id)}
        isBlockedByConflict={blockedByConflictIds.has(proposal.id)}
        showToolbar={!isEditing}
        showEditButton={showEditButton}
        onViewModeChange={(mode) => onViewModeChange(proposal.id, mode)}
        onEdit={() => onEdit(proposal.id)}
        onAccept={() => onAccept(proposal.id)}
        onDismiss={() => onDismiss(proposal.id)}
        onUndo={() => onUndo(proposal.id)}
        renderExpandedView={renderExpandedView}
      />
    );
  };

  return (
    <PMBox>
      <ChangesSummaryBar
        totalCount={counts.total}
        pendingCount={counts.pending}
        acceptedCount={counts.accepted}
        dismissedCount={counts.dismissed}
      />
      <PMBox px={6} pb={6}>
        <PMAccordion.Root
          collapsible
          multiple
          value={expandedCardIds}
          onValueChange={handleValueChange}
        >
          <PMVStack gap={3} width="full">
            {pending.map(renderCard)}
            {reviewed.length > 0 && (
              <>
                <ReviewedSectionDivider count={reviewed.length} />
                {reviewed.map(renderCard)}
              </>
            )}
          </PMVStack>
        </PMAccordion.Root>
      </PMBox>
    </PMBox>
  );
}
