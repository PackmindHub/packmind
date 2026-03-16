import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMBox, PMSpinner } from '@packmind/ui';
import {
  AcceptedChangeProposal,
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalStatus,
  OrganizationId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { isEditableProposalType } from '../../utils/editableProposalTypes';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  useGetRulesByStandardIdQuery,
  useGetStandardByIdQuery,
} from '../../../standards/api/queries/StandardsQueries';
import {
  useApplyStandardChangeProposalsMutation,
  useListChangeProposalsByStandardQuery,
} from '../../api/queries/ChangeProposalsQueries';
import {
  GET_CHANGE_PROPOSALS_BY_STANDARD_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../../api/queryKeys';
import { useUserLookup } from '../../hooks/useUserLookup';
import { useChangeProposalPool } from '../../hooks/useChangeProposalPool';
import { useNavigateAfterApply } from '../../hooks/useNavigateAfterApply';
import { useCardReviewState, ViewMode } from '../../hooks/useCardReviewState';
import { ChangeProposalWithConflicts } from '../../types';
import { getStandardByIdKey } from '../../../standards/api/queryKeys';
import {
  computeRemovalOutdatedIds,
  computeStandardOutdatedIds,
  mergeOutdatedIds,
} from '../../utils/computeOutdatedProposalIds';
import { ChangeProposalAccordion } from '../shared/ChangeProposalAccordion';
import { ReviewHeader } from '../shared/ReviewHeader';
import { StandardDiffView } from './StandardDiffView';
import { StandardInlineView } from './StandardInlineView';
import { StandardOriginalTabContent } from './StandardOriginalTabContent';
import { StandardResultTabContent } from './StandardResultTabContent';
import { useBeforeUnload, useBlocker } from 'react-router';
import { routes } from '../../../../shared/utils/routes';

interface StandardReviewDetailProps {
  artefactId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function StandardReviewDetail({
  artefactId,
  orgSlug,
  spaceSlug,
}: Readonly<StandardReviewDetailProps>) {
  const standardId = artefactId as StandardId;
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const applyStandardChangeProposalsMutation =
    useApplyStandardChangeProposalsMutation({ orgSlug, spaceSlug });
  const { data: selectedStandardProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsByStandardQuery(standardId);

  const selectedStandardProposals =
    selectedStandardProposalsData?.changeProposals ?? [];
  const currentPackageIds =
    selectedStandardProposalsData?.currentPackageIds ?? [];

  const { data: selectedStandardData } = useGetStandardByIdQuery(standardId);
  const selectedStandard = selectedStandardData?.standard ?? undefined;

  const { data: rulesData, isLoading: isLoadingRules } =
    useGetRulesByStandardIdQuery(
      organizationId as OrganizationId,
      spaceId as SpaceId,
      standardId,
    );
  const rules = rulesData ?? [];

  const pool = useChangeProposalPool(selectedStandardProposals);
  const navigateToNextArtifact = useNavigateAfterApply(artefactId);

  const reviewState = useCardReviewState();

  const hasInitiallyExpanded = useRef(false);
  useEffect(() => {
    if (hasInitiallyExpanded.current) return;
    if (selectedStandardProposals.length === 0) return;

    const sorted = [...selectedStandardProposals].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    reviewState.toggleCard([sorted[0].id]);
    hasInitiallyExpanded.current = true;
  }, [selectedStandardProposals, reviewState.toggleCard]);

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

  const outdatedProposalIds = useMemo(
    () =>
      mergeOutdatedIds(
        computeStandardOutdatedIds(
          selectedStandardProposals,
          selectedStandard,
          rules,
        ),
        computeRemovalOutdatedIds(selectedStandardProposals, currentPackageIds),
      ),
    [selectedStandardProposals, selectedStandard, rules, currentPackageIds],
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

    const accepted = selectedStandardProposals.reduce((acc, changeProposal) => {
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
      await applyStandardChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: standardId,
        accepted,
        rejected: Array.from(pool.rejectedProposalIds),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_CHANGE_PROPOSALS_BY_STANDARD_KEY, standardId],
        }),
        queryClient.invalidateQueries({
          queryKey: getStandardByIdKey(spaceId, standardId),
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
    applyStandardChangeProposalsMutation,
    queryClient,
    pool.resetPool,
    standardId,
    navigateToNextArtifact,
  ]);

  const renderExpandedView = useCallback(
    (viewMode: ViewMode, proposal: ChangeProposalWithConflicts) => {
      if (!selectedStandard) return null;

      if (viewMode === 'diff')
        return (
          <StandardDiffView
            proposal={proposal}
            standard={selectedStandard}
            rules={rules}
          />
        );
      if (viewMode === 'inline')
        return (
          <StandardInlineView
            proposal={proposal}
            standard={selectedStandard}
            rules={rules}
          />
        );
      return null;
    },
    [selectedStandard, rules],
  );

  const latestProposal = useMemo(() => {
    if (selectedStandardProposals.length === 0) return null;
    return [...selectedStandardProposals].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [selectedStandardProposals]);

  const latestAuthor = latestProposal
    ? (userLookup.get(latestProposal.createdBy) ?? 'Unknown')
    : '';
  const latestTime = latestProposal?.createdAt ?? new Date();

  if (isLoadingProposals || isLoadingRules) {
    return (
      <PMBox gridColumn="span 2" display="flex" justifyContent="center" p={8}>
        <PMSpinner />
      </PMBox>
    );
  }

  if (!selectedStandard) {
    return null;
  }

  const artefactLink =
    orgSlug && spaceSlug
      ? routes.space.toStandard(orgSlug, spaceSlug, artefactId)
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
          artefactName={selectedStandard.name}
          artefactVersion={selectedStandard.version}
          latestAuthor={latestAuthor}
          latestTime={latestTime}
          activeTab={reviewState.activeTab}
          onTabChange={reviewState.setActiveTab}
          acceptedCount={pool.acceptedProposalIds.size}
          dismissedCount={pool.rejectedProposalIds.size}
          pendingCount={
            selectedStandardProposals.length -
            pool.acceptedProposalIds.size -
            pool.rejectedProposalIds.size
          }
          hasPooledDecisions={pool.hasPooledDecisions}
          isSaving={applyStandardChangeProposalsMutation.isPending}
          onSave={handleSave}
          artefactLink={artefactLink}
        />

        {reviewState.activeTab === 'changes' && (
          <ChangeProposalAccordion
            proposals={selectedStandardProposals}
            acceptedProposalIds={pool.acceptedProposalIds}
            rejectedProposalIds={pool.rejectedProposalIds}
            blockedByConflictIds={pool.blockedByConflictIds}
            outdatedProposalIds={outdatedProposalIds}
            expandedCardIds={reviewState.expandedCardIds}
            showEditButton={isEditableProposalType}
            userLookup={userLookup}
            onToggleCard={reviewState.toggleCard}
            getViewMode={reviewState.getViewMode}
            onViewModeChange={reviewState.setViewMode}
            onAccept={handleAcceptAndCollapse}
            onDismiss={handleDismissAndCollapse}
            onUndo={pool.handleUndoPool}
            getDecisionForProposal={pool.getDecisionForChangeProposal}
            onExpandCard={reviewState.expandCard}
            renderExpandedView={renderExpandedView}
          />
        )}

        {reviewState.activeTab === 'original' && (
          <StandardOriginalTabContent
            standard={selectedStandard}
            rules={rules}
          />
        )}

        {reviewState.activeTab === 'result' && (
          <StandardResultTabContent
            standard={selectedStandard}
            rules={rules}
            proposals={selectedStandardProposals}
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
