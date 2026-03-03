import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMBox, PMSpinner } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  SkillId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetSkillWithFilesByIdQuery } from '../../../skills/api/queries/SkillsQueries';
import {
  useApplySkillChangeProposalsMutation,
  useListChangeProposalsBySkillQuery,
} from '../../api/queries/ChangeProposalsQueries';
import {
  GET_CHANGE_PROPOSALS_BY_SKILL_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../../api/queryKeys';
import { getSkillByIdKey } from '../../../skills/api/queryKeys';
import { useUserLookup } from '../../hooks/useUserLookup';
import { useChangeProposalPool } from '../../hooks/useChangeProposalPool';
import { useCardReviewState, ViewMode } from '../../hooks/useCardReviewState';
import { ChangeProposalWithConflicts } from '../../types';
import { computeSkillOutdatedIds } from '../../utils/computeOutdatedProposalIds';
import { ReviewHeader } from '../shared/ReviewHeader';
import { SkillGroupedAccordion } from './SkillGroupedAccordion';
import { SkillFocusedView } from './SkillFocusedView';
import { SkillInlineView } from './SkillInlineView';
import { SkillOriginalTabContent } from './SkillOriginalTabContent';
import { SkillResultTabContent } from './SkillResultTabContent';
import { useBlocker, useBeforeUnload } from 'react-router';

interface SkillReviewDetailProps {
  artefactId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function SkillReviewDetail({
  artefactId,
  orgSlug,
  spaceSlug,
}: Readonly<SkillReviewDetailProps>) {
  const skillId = artefactId as SkillId;
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const { data: selectedSkillData } = useGetSkillWithFilesByIdQuery(skillId);
  const selectedSkill = selectedSkillData ?? undefined;
  const skill = selectedSkill?.skill;
  const files = selectedSkill?.files ?? [];
  const skillSlug = skill?.slug;

  const applySkillChangeProposalsMutation =
    useApplySkillChangeProposalsMutation({ orgSlug, spaceSlug, skillSlug });

  const { data: selectedSkillProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsBySkillQuery(skillId);

  const selectedSkillProposals =
    selectedSkillProposalsData?.changeProposals ?? [];

  const pool = useChangeProposalPool(selectedSkillProposals);

  const reviewState = useCardReviewState();

  const outdatedProposalIds = useMemo(
    () => computeSkillOutdatedIds(selectedSkillProposals, skill, files),
    [selectedSkillProposals, skill, files],
  );

  useBeforeUnload(
    useCallback(
      (event) => {
        if (pool.hasPooledDecisions) {
          event.preventDefault();
        }
      },
      [pool.hasPooledDecisions],
    ),
  );

  const blocker = useBlocker(pool.hasPooledDecisions);

  const handleSave = useCallback(async () => {
    if (!organizationId || !spaceId) return;
    if (!pool.hasPooledDecisions) return;

    try {
      await applySkillChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: skillId,
        accepted: Array.from(pool.acceptedProposalIds),
        rejected: Array.from(pool.rejectedProposalIds),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_CHANGE_PROPOSALS_BY_SKILL_KEY, skillId],
        }),
        queryClient.invalidateQueries({
          queryKey: getSkillByIdKey(spaceId, skillId),
        }),
      ]);

      pool.resetPool();
    } catch {
      // Errors are handled by the mutation onError callbacks
    }
  }, [
    organizationId,
    spaceId,
    pool.acceptedProposalIds,
    pool.rejectedProposalIds,
    pool.hasPooledDecisions,
    applySkillChangeProposalsMutation,
    queryClient,
    pool.resetPool,
    skillId,
  ]);

  const renderExpandedView = useCallback(
    (viewMode: ViewMode, proposal: ChangeProposalWithConflicts) => {
      if (!skill) return null;

      if (viewMode === 'diff')
        return (
          <SkillFocusedView proposal={proposal} skill={skill} files={files} />
        );
      if (viewMode === 'inline')
        return (
          <SkillInlineView proposal={proposal} skill={skill} files={files} />
        );
      return null;
    },
    [skill, files],
  );

  const latestProposal = useMemo(() => {
    if (selectedSkillProposals.length === 0) return null;
    return [...selectedSkillProposals].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [selectedSkillProposals]);

  const latestAuthor = latestProposal
    ? (userLookup.get(latestProposal.createdBy) ?? 'Unknown')
    : '';
  const latestTime = latestProposal?.createdAt ?? new Date();

  if (isLoadingProposals) {
    return (
      <PMBox gridColumn="span 2" display="flex" justifyContent="center" p={8}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (!skill) {
    return null;
  }

  return (
    <>
      <PMBox
        gridColumn="span 2"
        display="flex"
        flexDirection="column"
        height="full"
        overflowY="auto"
      >
        <ReviewHeader
          artefactName={skill.name}
          artefactVersion={skill.version}
          latestAuthor={latestAuthor}
          latestTime={latestTime}
          activeTab={reviewState.activeTab}
          onTabChange={reviewState.setActiveTab}
          acceptedCount={pool.acceptedProposalIds.size}
          hasPooledDecisions={pool.hasPooledDecisions}
          isSaving={applySkillChangeProposalsMutation.isPending}
          onSave={handleSave}
        />

        {reviewState.activeTab === 'changes' && (
          <SkillGroupedAccordion
            proposals={selectedSkillProposals}
            files={files}
            acceptedProposalIds={pool.acceptedProposalIds}
            rejectedProposalIds={pool.rejectedProposalIds}
            blockedByConflictIds={pool.blockedByConflictIds}
            outdatedProposalIds={outdatedProposalIds}
            expandedCardIds={reviewState.expandedCardIds}
            showEditButton={false}
            userLookup={userLookup}
            onToggleCard={reviewState.toggleCard}
            getViewMode={reviewState.getViewMode}
            onViewModeChange={reviewState.setViewMode}
            onEdit={() => {
              /* Edit mode is out of scope for skills */
            }}
            onAccept={pool.handlePoolAccept}
            onDismiss={pool.handlePoolReject}
            onUndo={pool.handleUndoPool}
            renderExpandedView={renderExpandedView}
          />
        )}

        {reviewState.activeTab === 'original' && (
          <SkillOriginalTabContent skill={skill} files={files} />
        )}

        {reviewState.activeTab === 'result' && (
          <SkillResultTabContent
            skill={skill}
            files={files}
            proposals={selectedSkillProposals}
            acceptedProposalIds={pool.acceptedProposalIds}
          />
        )}
      </PMBox>

      <PMAlertDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(details) => {
          if (!details.open) {
            blocker.reset?.();
          }
        }}
        title="Unsaved changes"
        message="You have unsaved changes. If you leave this page, your changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        confirmColorScheme="red"
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
