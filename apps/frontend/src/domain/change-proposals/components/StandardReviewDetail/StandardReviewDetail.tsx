import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMBox, PMSpinner } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  StandardId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import {
  useGetStandardByIdQuery,
  useGetRulesByStandardIdQuery,
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
import { useCardReviewState, ViewMode } from '../../hooks/useCardReviewState';
import { ChangeProposalWithConflicts } from '../../types';
import { getStandardByIdKey } from '../../../standards/api/queryKeys';
import { computeStandardOutdatedIds } from '../../utils/computeOutdatedProposalIds';
import { ChangeProposalAccordion } from '../shared/ChangeProposalAccordion';
import { ReviewHeader } from '../shared/ReviewHeader';
import { StandardFocusedView } from './StandardFocusedView';
import { StandardInlineView } from './StandardInlineView';
import { StandardOriginalTabContent } from './StandardOriginalTabContent';
import { StandardResultTabContent } from './StandardResultTabContent';
import { useBlocker, useBeforeUnload } from 'react-router';

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
    (proposalId: ChangeProposalId) => {
      pool.handlePoolAccept(proposalId);
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
      computeStandardOutdatedIds(
        selectedStandardProposals,
        selectedStandard,
        rules,
      ),
    [selectedStandardProposals, selectedStandard, rules],
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
      await applyStandardChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: standardId,
        accepted: Array.from(pool.acceptedProposalIds),
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
  ]);

  const renderExpandedView = useCallback(
    (viewMode: ViewMode, proposal: ChangeProposalWithConflicts) => {
      if (!selectedStandard) return null;

      if (viewMode === 'diff')
        return (
          <StandardFocusedView
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
          hasPooledDecisions={pool.hasPooledDecisions}
          isSaving={applyStandardChangeProposalsMutation.isPending}
          onSave={handleSave}
        />

        {reviewState.activeTab === 'changes' && (
          <ChangeProposalAccordion
            proposals={selectedStandardProposals}
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
              /* Edit mode is out of scope for standards */
            }}
            onAccept={handleAcceptAndCollapse}
            onDismiss={handleDismissAndCollapse}
            onUndo={pool.handleUndoPool}
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
