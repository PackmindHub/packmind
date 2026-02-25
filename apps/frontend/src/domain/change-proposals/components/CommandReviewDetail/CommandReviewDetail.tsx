import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMAlertDialog, PMSpinner } from '@packmind/ui';
import { OrganizationId, RecipeId, SpaceId } from '@packmind/types';
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
import { GET_RECIPE_BY_ID_KEY } from '../../../recipes/api/queryKeys';
import { computeCommandOutdatedIds } from '../../utils/computeOutdatedProposalIds';
import { ReviewDetailLayout } from '../ReviewDetailLayout';
import { ProposalReviewPanel } from './ProposalReviewPanel';
import { useParams, useBlocker, useBeforeUnload } from 'react-router';

interface CommandReviewDetailProps {
  artefactId: string;
}

export function CommandReviewDetail({
  artefactId,
}: Readonly<CommandReviewDetailProps>) {
  const recipeId = artefactId as RecipeId;
  const { organization } = useAuthContext();
  const { spaceId, space } = useCurrentSpace();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const applyRecipeChangeProposalsMutation =
    useApplyRecipeChangeProposalsMutation({
      orgSlug,
      spaceSlug: space?.slug,
    });
  const { data: selectedRecipeProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsByRecipeQuery(recipeId);

  const selectedRecipeProposals =
    selectedRecipeProposalsData?.changeProposals ?? [];

  const { data: selectedRecipe } = useGetRecipeByIdQuery(recipeId);

  const pool = useChangeProposalPool(selectedRecipeProposals);

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

  return (
    <>
      <ReviewDetailLayout
        proposals={selectedRecipeProposals}
        reviewingProposalId={pool.reviewingProposalId}
        acceptedProposalIds={pool.acceptedProposalIds}
        rejectedProposalIds={pool.rejectedProposalIds}
        blockedByConflictIds={pool.blockedByConflictIds}
        hasPooledDecisions={pool.hasPooledDecisions}
        outdatedProposalIds={outdatedProposalIds}
        userLookup={userLookup}
        onSelectProposal={pool.handleSelectProposal}
        onPoolAccept={pool.handlePoolAccept}
        onPoolReject={pool.handlePoolReject}
        onUndoPool={pool.handleUndoPool}
        onSave={handleSave}
        isSaving={applyRecipeChangeProposalsMutation.isPending}
        showUnifiedView={false}
        onUnifiedViewChange={() => {
          // no-op
        }}
      >
        {isLoadingProposals ? (
          <PMSpinner />
        ) : (
          <ProposalReviewPanel
            selectedRecipe={selectedRecipe}
            selectedRecipeProposals={selectedRecipeProposals}
            reviewingProposalId={pool.reviewingProposalId}
            outdatedProposalIds={outdatedProposalIds}
            acceptedProposalIds={pool.acceptedProposalIds}
            rejectedProposalIds={pool.rejectedProposalIds}
            blockedByConflictIds={pool.blockedByConflictIds}
            userLookup={userLookup}
            onSelectProposal={pool.handleSelectProposal}
            onPoolAccept={pool.handlePoolAccept}
            onPoolReject={pool.handlePoolReject}
            onUndoPool={pool.handleUndoPool}
          />
        )}
      </ReviewDetailLayout>
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
