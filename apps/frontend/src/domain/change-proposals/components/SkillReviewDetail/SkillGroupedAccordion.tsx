import { ReactNode, useMemo, useCallback } from 'react';
import { PMAccordion, PMBox, PMVStack } from '@packmind/ui';
import {
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalType,
  SkillFile,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../../types';
import { ViewMode } from '../../hooks/useCardReviewState';
import { buildProposalNumberMap } from '../../utils/changeProposalHelpers';
import {
  groupSkillProposalsByFile,
  REMOVAL_GROUP_PATH,
} from '../../utils/groupSkillProposalsByFile';
import { ChangesSummaryBar } from '../shared/ChangesSummaryBar';
import { ChangeProposalCard } from '../shared/ChangeProposalCard';
import { ReviewedSectionDivider } from '../shared/ReviewedSectionDivider';
import { FileGroupHeader } from '../shared/FileGroupHeader';

type PoolStatus = 'pending' | 'accepted' | 'dismissed';

interface SkillGroupedAccordionProps {
  proposals: ChangeProposalWithConflicts[];
  files: SkillFile[];
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  blockedByConflictIds: Set<ChangeProposalId>;
  outdatedProposalIds: Set<ChangeProposalId>;
  expandedCardIds: string[];
  showEditButton?: boolean | ((proposalType: ChangeProposalType) => boolean);
  userLookup: Map<string, string>;
  onToggleCard: (ids: string[]) => void;
  getViewMode: (proposalId: ChangeProposalId) => ViewMode;
  onViewModeChange: (proposalId: ChangeProposalId, mode: ViewMode) => void;
  onEdit?: (proposalId: ChangeProposalId) => void;
  onAccept: (
    proposalId: ChangeProposalId,
    decision: ChangeProposalDecision,
  ) => void;
  onDismiss: (proposalId: ChangeProposalId) => void;
  onUndo: (proposalId: ChangeProposalId) => void;
  getDecisionForProposal?: (
    proposal: ChangeProposalWithConflicts,
  ) => ChangeProposalDecision | undefined;
  onExpandCard?: (id: string) => void;
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

export function SkillGroupedAccordion({
  proposals,
  files,
  acceptedProposalIds,
  rejectedProposalIds,
  blockedByConflictIds,
  outdatedProposalIds,
  expandedCardIds,
  showEditButton,
  userLookup,
  onToggleCard,
  getViewMode,
  onViewModeChange,
  onEdit,
  onAccept,
  onDismiss,
  onUndo,
  getDecisionForProposal,
  onExpandCard,
  renderExpandedView,
}: Readonly<SkillGroupedAccordionProps>) {
  const proposalNumberMap = useMemo(
    () => buildProposalNumberMap(proposals),
    [proposals],
  );

  const fileGroups = useMemo(
    () =>
      groupSkillProposalsByFile(
        proposals,
        files,
        acceptedProposalIds,
        rejectedProposalIds,
      ),
    [proposals, files, acceptedProposalIds, rejectedProposalIds],
  );

  const globalCounts = useMemo(
    () => ({
      total: proposals.length,
      pending:
        proposals.length - acceptedProposalIds.size - rejectedProposalIds.size,
      accepted: acceptedProposalIds.size,
      dismissed: rejectedProposalIds.size,
    }),
    [proposals.length, acceptedProposalIds.size, rejectedProposalIds.size],
  );

  const handleValueChange = useCallback(
    (details: { value: string[] }) => {
      onToggleCard(details.value);
    },
    [onToggleCard],
  );

  const { pendingFileGroups, reviewedFileGroups, totalReviewedCount } =
    useMemo(() => {
      const pending: {
        filePath: string;
        changeCount: number;
        pendingCount: number;
        proposals: ChangeProposalWithConflicts[];
      }[] = [];
      const reviewed: {
        filePath: string;
        proposals: ChangeProposalWithConflicts[];
      }[] = [];
      let reviewedCount = 0;

      for (const group of fileGroups) {
        const pendingProposals = group.proposals.filter(
          (p) =>
            getPoolStatus(p.id, acceptedProposalIds, rejectedProposalIds) ===
            'pending',
        );
        const reviewedProposals = group.proposals.filter(
          (p) =>
            getPoolStatus(p.id, acceptedProposalIds, rejectedProposalIds) !==
            'pending',
        );

        if (pendingProposals.length > 0) {
          pending.push({
            filePath: group.filePath,
            changeCount: group.changeCount,
            pendingCount: group.pendingCount,
            proposals: pendingProposals,
          });
        }

        if (reviewedProposals.length > 0) {
          reviewed.push({
            filePath: group.filePath,
            proposals: reviewedProposals,
          });
          reviewedCount += reviewedProposals.length;
        }
      }

      return {
        pendingFileGroups: pending,
        reviewedFileGroups: reviewed,
        totalReviewedCount: reviewedCount,
      };
    }, [fileGroups, acceptedProposalIds, rejectedProposalIds]);

  const flatPending = useMemo(
    () => pendingFileGroups.flatMap((g) => g.proposals),
    [pendingFileGroups],
  );

  const expandNextPending = useCallback(
    (proposalId: ChangeProposalId) => {
      if (!onExpandCard) return;
      const idx = flatPending.findIndex((p) => p.id === proposalId);
      const next = flatPending
        .slice(idx + 1)
        .find((p) => !expandedCardIds.includes(p.id));
      if (next) onExpandCard(next.id);
    },
    [onExpandCard, flatPending, expandedCardIds],
  );

  const handleAccept = useCallback(
    (proposalId: ChangeProposalId, decision: ChangeProposalDecision) => {
      onAccept(proposalId, decision);
      expandNextPending(proposalId);
    },
    [onAccept, expandNextPending],
  );

  const handleDismiss = useCallback(
    (proposalId: ChangeProposalId) => {
      onDismiss(proposalId);
      expandNextPending(proposalId);
    },
    [onDismiss, expandNextPending],
  );

  const resolveShowEditButton = useCallback(
    (proposalType: ChangeProposalType): boolean | undefined => {
      if (typeof showEditButton === 'function') {
        return showEditButton(proposalType);
      }
      return showEditButton;
    },
    [showEditButton],
  );

  const renderCard = (proposal: ChangeProposalWithConflicts) => {
    const poolStatus = getPoolStatus(
      proposal.id,
      acceptedProposalIds,
      rejectedProposalIds,
    );
    const viewMode = getViewMode(proposal.id);
    const authorName = userLookup.get(proposal.createdBy) ?? 'Unknown';

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
        showToolbar={true}
        showEditButton={resolveShowEditButton(
          proposal.type as ChangeProposalType,
        )}
        decision={getDecisionForProposal?.(proposal)}
        onViewModeChange={(mode) => onViewModeChange(proposal.id, mode)}
        onEdit={() => onEdit?.(proposal.id)}
        onAccept={(decision) => handleAccept(proposal.id, decision)}
        onDismiss={() => handleDismiss(proposal.id)}
        onUndo={() => onUndo(proposal.id)}
        renderExpandedView={renderExpandedView}
      />
    );
  };

  return (
    <PMBox>
      <ChangesSummaryBar
        totalCount={globalCounts.total}
        pendingCount={globalCounts.pending}
        acceptedCount={globalCounts.accepted}
        dismissedCount={globalCounts.dismissed}
      />
      <PMBox px={6} pb={6}>
        <PMAccordion.Root
          collapsible
          multiple
          value={expandedCardIds}
          onValueChange={handleValueChange}
        >
          <PMVStack gap={5} width="full">
            {pendingFileGroups.map((group) => (
              <PMVStack key={group.filePath} gap={3} width="full">
                {group.filePath !== REMOVAL_GROUP_PATH && (
                  <FileGroupHeader
                    filePath={group.filePath}
                    changeCount={group.changeCount}
                    pendingCount={group.pendingCount}
                  />
                )}
                {group.proposals.map(renderCard)}
              </PMVStack>
            ))}
            {totalReviewedCount > 0 && (
              <>
                <ReviewedSectionDivider count={totalReviewedCount} />
                {reviewedFileGroups.map((group) => (
                  <PMVStack
                    key={`reviewed-${group.filePath}`}
                    gap={3}
                    width="full"
                  >
                    {group.filePath !== REMOVAL_GROUP_PATH && (
                      <FileGroupHeader
                        filePath={group.filePath}
                        changeCount={group.proposals.length}
                        pendingCount={0}
                      />
                    )}
                    {group.proposals.map(renderCard)}
                  </PMVStack>
                ))}
              </>
            )}
          </PMVStack>
        </PMAccordion.Root>
      </PMBox>
    </PMBox>
  );
}
