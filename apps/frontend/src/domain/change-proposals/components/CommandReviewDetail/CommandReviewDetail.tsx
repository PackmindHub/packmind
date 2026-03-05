import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMBox, PMSpinner } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetRecipeByIdQuery } from '../../../recipes/api/queries/RecipesQueries';
import {
  useApplyRecipeChangeProposalsMutation,
  useListChangeProposalsByRecipeQuery,
} from '../../api/queries/ChangeProposalsQueries';
import {
  GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../../api/queryKeys';
import { useUserLookup } from '../../hooks/useUserLookup';
import { useChangeProposalPool } from '../../hooks/useChangeProposalPool';
import { useCardReviewState, ViewMode } from '../../hooks/useCardReviewState';
import { ChangeProposalWithConflicts } from '../../types';
import { GET_RECIPE_BY_ID_KEY } from '../../../recipes/api/queryKeys';
import { computeCommandOutdatedIds } from '../../utils/computeOutdatedProposalIds';
import { ChangeProposalAccordion } from '../shared/ChangeProposalAccordion';
import { CommandReviewHeader } from './CommandReviewHeader';
import { FocusedView } from './FocusedView';
import { InlineView } from './InlineView';
import { OriginalTabContent } from './OriginalTabContent';
import { ResultTabContent } from './ResultTabContent';
import { useParams, useBlocker, useBeforeUnload } from 'react-router';

interface CommandReviewDetailProps {
  artefactId: string;
  orgSlug?: string;
  spaceSlug?: string;
}

export function CommandReviewDetail({
  artefactId,
  orgSlug: orgSlugProp,
  spaceSlug: spaceSlugProp,
}: Readonly<CommandReviewDetailProps>) {
  const recipeId = artefactId as RecipeId;
  const { organization } = useAuthContext();
  const { spaceId, space } = useCurrentSpace();
  const { orgSlug: orgSlugParam } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const orgSlug = orgSlugProp ?? orgSlugParam;
  const spaceSlug = spaceSlugProp ?? space?.slug;

  const applyRecipeChangeProposalsMutation =
    useApplyRecipeChangeProposalsMutation({
      orgSlug,
      spaceSlug,
    });
  const { data: selectedRecipeProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsByRecipeQuery(recipeId);

  const selectedRecipeProposals =
    selectedRecipeProposalsData?.changeProposals ?? [];

  const { data: selectedRecipe } = useGetRecipeByIdQuery(recipeId);

  const pool = useChangeProposalPool(selectedRecipeProposals);

  const reviewState = useCardReviewState();

  const hasInitiallyExpanded = useRef(false);
  useEffect(() => {
    if (hasInitiallyExpanded.current) return;
    if (selectedRecipeProposals.length === 0) return;

    const sorted = [...selectedRecipeProposals].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    reviewState.toggleCard([sorted[0].id]);
    hasInitiallyExpanded.current = true;
  }, [selectedRecipeProposals, reviewState.toggleCard]);

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
    () => computeCommandOutdatedIds(selectedRecipeProposals, selectedRecipe),
    [selectedRecipeProposals, selectedRecipe],
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
      await applyRecipeChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: recipeId,
        accepted: Array.from(pool.acceptedProposalIds),
        rejected: Array.from(pool.rejectedProposalIds),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_CHANGE_PROPOSALS_BY_RECIPE_KEY, recipeId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_RECIPE_BY_ID_KEY, recipeId],
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
    applyRecipeChangeProposalsMutation,
    queryClient,
    pool.resetPool,
  ]);

  const renderExpandedView = useCallback(
    (viewMode: ViewMode, proposal: ChangeProposalWithConflicts) => {
      if (!selectedRecipe) return null;

      if (viewMode === 'diff')
        return <FocusedView recipe={selectedRecipe} proposal={proposal} />;
      if (viewMode === 'inline')
        return <InlineView recipe={selectedRecipe} proposal={proposal} />;
      return null;
    },
    [selectedRecipe],
  );

  const latestProposal = useMemo(() => {
    if (selectedRecipeProposals.length === 0) return null;
    return [...selectedRecipeProposals].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [selectedRecipeProposals]);

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

  if (!selectedRecipe) {
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
        <CommandReviewHeader
          artefactName={selectedRecipe.name}
          artefactVersion={selectedRecipe.version}
          latestAuthor={latestAuthor}
          latestTime={latestTime}
          activeTab={reviewState.activeTab}
          onTabChange={reviewState.setActiveTab}
          acceptedCount={pool.acceptedProposalIds.size}
          hasPooledDecisions={pool.hasPooledDecisions}
          isSaving={applyRecipeChangeProposalsMutation.isPending}
          onSave={handleSave}
        />

        {reviewState.activeTab === 'changes' && (
          <ChangeProposalAccordion
            proposals={selectedRecipeProposals}
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
              /* Edit mode is not supported for commands */
            }}
            onAccept={handleAcceptAndCollapse}
            onDismiss={handleDismissAndCollapse}
            onUndo={pool.handleUndoPool}
            renderExpandedView={renderExpandedView}
          />
        )}

        {reviewState.activeTab === 'original' && (
          <OriginalTabContent recipe={selectedRecipe} />
        )}

        {reviewState.activeTab === 'result' && (
          <ResultTabContent
            recipe={selectedRecipe}
            proposals={selectedRecipeProposals}
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
