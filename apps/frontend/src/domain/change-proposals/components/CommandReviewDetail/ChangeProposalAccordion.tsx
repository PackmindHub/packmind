import { useMemo, useCallback } from 'react';
import { PMAccordion, PMBox, PMVStack } from '@packmind/ui';
import { ChangeProposalId, Recipe } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCommandReviewState';
import { buildProposalNumberMap } from '../../utils/changeProposalHelpers';
import { ChangesSummaryBar } from './ChangesSummaryBar';
import { ChangeProposalCard } from './ChangeProposalCard';
import { ReviewedSectionDivider } from './ReviewedSectionDivider';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface ChangeProposalAccordionProps {
  proposals: ChangeProposalWithConflicts[];
  recipe: Recipe;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  outdatedProposalIds: Set<ChangeProposalId>;
  expandedCardIds: string[];
  editingProposalId: ChangeProposalId | null;
  editedValues: Map<ChangeProposalId, string>;
  userLookup: Map<string, string>;
  onToggleCard: (ids: string[]) => void;
  getViewMode: (proposalId: ChangeProposalId) => ViewMode;
  onViewModeChange: (proposalId: ChangeProposalId, mode: ViewMode) => void;
  onEdit: (proposalId: ChangeProposalId) => void;
  onAccept: (proposalId: ChangeProposalId) => void;
  onDismiss: (proposalId: ChangeProposalId) => void;
  onUndo: (proposalId: ChangeProposalId) => void;
  onEditedValueChange: (proposalId: ChangeProposalId, value: string) => void;
  onResetToOriginal: (proposalId: ChangeProposalId) => void;
  onCancelEdit: () => void;
  onSaveAndAccept: (proposalId: ChangeProposalId) => void;
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
  recipe,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  outdatedProposalIds,
  expandedCardIds,
  editingProposalId,
  editedValues,
  userLookup,
  onToggleCard,
  getViewMode,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  onEditedValueChange,
  onResetToOriginal,
  onCancelEdit,
  onSaveAndAccept,
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
    const isEditing = editingProposalId === proposal.id;
    const payload = proposal.payload as { oldValue: string; newValue: string };
    const editedValue = editedValues.get(proposal.id) ?? payload.newValue;
    const isEditModified = editedValue !== payload.newValue;
    const authorName = userLookup.get(proposal.createdBy) ?? 'Unknown';

    return (
      <ChangeProposalCard
        key={proposal.id}
        proposal={proposal}
        proposalNumber={proposalNumberMap.get(proposal.id) ?? 0}
        recipe={recipe}
        poolStatus={poolStatus}
        authorName={authorName}
        viewMode={viewMode}
        isEditing={isEditing}
        editedValue={editedValue}
        isOutdated={outdatedProposalIds.has(proposal.id)}
        isBlockedByConflict={blockedByConflictIds.has(proposal.id)}
        isEditModified={isEditModified}
        onViewModeChange={(mode) => onViewModeChange(proposal.id, mode)}
        onEdit={() => onEdit(proposal.id)}
        onAccept={() => onAccept(proposal.id)}
        onDismiss={() => onDismiss(proposal.id)}
        onUndo={() => onUndo(proposal.id)}
        onEditedValueChange={onEditedValueChange}
        onResetToOriginal={onResetToOriginal}
        onCancelEdit={onCancelEdit}
        onSaveAndAccept={onSaveAndAccept}
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
