import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMBox, PMSpinner } from '@packmind/ui';
import {
  AcceptedChangeProposal,
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalStatus,
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
import { useNavigateAfterApply } from '../../hooks/useNavigateAfterApply';
import {
  useCardReviewState,
  ReviewTab,
  ViewMode,
} from '../../hooks/useCardReviewState';
import { ChangeProposalWithConflicts } from '../../types';
import {
  computeRemovalOutdatedIds,
  computeSkillOutdatedIds,
  mergeOutdatedIds,
} from '../../utils/computeOutdatedProposalIds';
import {
  filterProposalsByFilePath,
  getFilePathsWithChanges,
  hasChangesForFilter,
} from '../../utils/filterProposalsByFilePath';
import { ReviewHeader } from '../shared/ReviewHeader';
import { SkillGroupedAccordion } from './SkillGroupedAccordion';
import { extractProposalDiffValues } from '../../utils/extractProposalDiffValues';
import {
  getProposalFilePath,
  isBinaryProposal,
  SKILL_MD_PATH,
} from '../../utils/groupSkillProposalsByFile';
import { isMarkdownPath } from './FileItems/FileContent';
import { BinaryFilePlaceholder } from '../shared/BinaryFilePlaceholder';
import { FocusedView } from '../shared/FocusedView';
import { SkillDiffView } from './SkillDiffView';
import { SkillInlineView } from './SkillInlineView';
import { SkillOriginalTabContent } from './SkillOriginalTabContent';
import { SkillResultTabContent } from './SkillResultTabContent';
import { useBlocker, useBeforeUnload, useSearchParams } from 'react-router';
import { routes } from '../../../../shared/utils/routes';
import { SKILL_MD_MARKDOWN_TYPES } from '../../constants/skillProposalTypes';

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
  const currentPackageIds = selectedSkillProposalsData?.currentPackageIds ?? [];

  const pool = useChangeProposalPool(selectedSkillProposals);
  const navigateToNextArtifact = useNavigateAfterApply(artefactId);

  const reviewState = useCardReviewState();

  const hasInitiallyExpanded = useRef(false);
  useEffect(() => {
    if (hasInitiallyExpanded.current) return;
    if (selectedSkillProposals.length === 0) return;

    const sorted = [...selectedSkillProposals].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    reviewState.toggleCard([sorted[0].id]);
    hasInitiallyExpanded.current = true;
  }, [selectedSkillProposals, reviewState.toggleCard]);

  const handleAcceptAndCollapse = useCallback(
    (proposalId: ChangeProposalId, decision: ChangeProposalDecision) => {
      pool.handlePoolAccept(proposalId, decision);
      reviewState.collapseCard(proposalId);
    },
    [pool.handlePoolAccept, reviewState.collapseCard],
  );

  const handleDismissAndCollapse = useCallback(
    (proposalId: ChangeProposalId) => {
      pool.handlePoolReject(proposalId);
      reviewState.collapseCard(proposalId);
    },
    [pool.handlePoolReject, reviewState.collapseCard],
  );

  const [searchParams] = useSearchParams();
  const filePathFilter = searchParams.get('file') ?? '';

  const filePathsWithChanges = useMemo(
    () => getFilePathsWithChanges(selectedSkillProposals, files),
    [selectedSkillProposals, files],
  );

  const filteredProposals = useMemo(
    () =>
      filterProposalsByFilePath(selectedSkillProposals, files, filePathFilter),
    [selectedSkillProposals, files, filePathFilter],
  );

  const filterHasChanges = useMemo(
    () => hasChangesForFilter(filePathsWithChanges, filePathFilter),
    [filePathsWithChanges, filePathFilter],
  );

  const disabledTabs: ReviewTab[] = useMemo(
    () =>
      !selectedSkillProposalsData || filterHasChanges
        ? []
        : ['changes', 'result'],
    [selectedSkillProposalsData, filterHasChanges],
  );

  useEffect(() => {
    if (!selectedSkillProposalsData) return;
    reviewState.setActiveTab(filterHasChanges ? 'changes' : 'original');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only auto-switch when file filter changes
  }, [filePathFilter]);

  const outdatedProposalIds = useMemo(
    () =>
      mergeOutdatedIds(
        computeSkillOutdatedIds(selectedSkillProposals, skill, files),
        computeRemovalOutdatedIds(selectedSkillProposals, currentPackageIds),
      ),
    [selectedSkillProposals, skill, files, currentPackageIds],
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

    const accepted = selectedSkillProposals.reduce((acc, changeProposal) => {
      if (pool.acceptedProposalIds.has(changeProposal.id)) {
        acc.push({
          ...changeProposal,
          status: ChangeProposalStatus.applied,
          decision: pool.getDecisionForChangeProposal(changeProposal),
        });
      }
      return acc;
    }, [] as AcceptedChangeProposal[]);

    try {
      await applySkillChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: skillId,
        accepted,
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
      navigateToNextArtifact();
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
    navigateToNextArtifact,
  ]);

  const renderExpandedView = useCallback(
    (viewMode: ViewMode, proposal: ChangeProposalWithConflicts) => {
      if (!skill) return null;

      if (viewMode === 'focused') {
        if (isBinaryProposal(proposal)) {
          return <BinaryFilePlaceholder />;
        }
        const filePath = getProposalFilePath(proposal, files);
        const { oldValue, newValue } = extractProposalDiffValues(proposal);
        const isMarkdownContent =
          filePath === SKILL_MD_PATH
            ? SKILL_MD_MARKDOWN_TYPES.has(proposal.type)
            : isMarkdownPath(filePath);
        return (
          <FocusedView
            oldValue={oldValue}
            newValue={newValue}
            isMarkdownContent={isMarkdownContent}
            filePath={filePath !== SKILL_MD_PATH ? filePath : undefined}
          />
        );
      }
      if (viewMode === 'diff')
        return <SkillDiffView proposal={proposal} files={files} />;
      if (viewMode === 'inline')
        return <SkillInlineView proposal={proposal} files={files} />;
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

  const artefactLink =
    orgSlug && spaceSlug && skillSlug
      ? routes.space.toSkill(orgSlug, spaceSlug, skillSlug)
      : undefined;

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
          dismissedCount={pool.rejectedProposalIds.size}
          pendingCount={
            selectedSkillProposals.length -
            pool.acceptedProposalIds.size -
            pool.rejectedProposalIds.size
          }
          hasPooledDecisions={pool.hasPooledDecisions}
          isSaving={applySkillChangeProposalsMutation.isPending}
          onSave={handleSave}
          disabledTabs={disabledTabs}
          artefactLink={artefactLink}
        />

        {reviewState.activeTab === 'changes' && (
          <SkillGroupedAccordion
            proposals={filteredProposals}
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
            onAccept={handleAcceptAndCollapse}
            onDismiss={handleDismissAndCollapse}
            onUndo={pool.handleUndoPool}
            getDecisionForProposal={pool.getDecisionForChangeProposal}
            onExpandCard={reviewState.expandCard}
            renderExpandedView={renderExpandedView}
          />
        )}

        {reviewState.activeTab === 'original' && (
          <SkillOriginalTabContent
            skill={skill}
            files={files}
            filePathFilter={filePathFilter}
          />
        )}

        {reviewState.activeTab === 'result' && (
          <SkillResultTabContent
            skill={skill}
            files={files}
            proposals={selectedSkillProposals}
            acceptedProposalIds={pool.acceptedProposalIds}
            filePathFilter={filePathFilter}
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
