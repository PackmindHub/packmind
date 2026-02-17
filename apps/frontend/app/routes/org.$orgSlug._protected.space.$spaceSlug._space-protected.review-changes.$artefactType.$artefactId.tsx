import { useParams } from 'react-router';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMBox, PMHStack, PMText, PMSpinner, PMButton } from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../src/domain/spaces/hooks/useCurrentSpace';
import { useGetRecipeByIdQuery } from '../../src/domain/recipes/api/queries/RecipesQueries';
import {
  useBatchApplyChangeProposalsMutation,
  useBatchRejectChangeProposalsMutation,
} from '../../src/domain/recipes/api/queries/ChangeProposalsQueries';
import { useListChangeProposalsByRecipeQuery } from '../../src/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../../src/domain/change-proposals/api/queryKeys';
import { useUserLookup } from '../../src/domain/change-proposals/hooks/useUserLookup';
import { ChangeProposalsPreviewPanel } from '../../src/domain/change-proposals/components/ChangeProposals/ChangeProposalsPreviewPanel';
import { ChangeProposalsChangesList } from '../../src/domain/change-proposals/components/ChangeProposals/ChangeProposalsChangesList';

function CommandReviewDetail({ artefactId }: Readonly<{ artefactId: string }>) {
  const recipeId = artefactId as RecipeId;
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  const [reviewingProposalId, setReviewingProposalId] =
    useState<ChangeProposalId | null>(null);
  const [acceptedProposalIds, setAcceptedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());
  const [rejectedProposalIds, setRejectedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());

  const batchApplyMutation = useBatchApplyChangeProposalsMutation();
  const batchRejectMutation = useBatchRejectChangeProposalsMutation();

  const { data: selectedRecipeProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsByRecipeQuery(recipeId);

  const selectedRecipeProposals =
    selectedRecipeProposalsData?.changeProposals ?? [];

  const { data: selectedRecipe } = useGetRecipeByIdQuery(recipeId);

  const handleReviewProposal = useCallback((proposalId: ChangeProposalId) => {
    setReviewingProposalId((prev) => (prev === proposalId ? null : proposalId));
  }, []);

  const handlePoolAccept = useCallback((proposalId: ChangeProposalId) => {
    setAcceptedProposalIds((prev) => {
      const next = new Set(prev);
      next.add(proposalId);
      return next;
    });
    setRejectedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
  }, []);

  const handlePoolReject = useCallback((proposalId: ChangeProposalId) => {
    setRejectedProposalIds((prev) => {
      const next = new Set(prev);
      next.add(proposalId);
      return next;
    });
    setAcceptedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
  }, []);

  const handleUndoPool = useCallback((proposalId: ChangeProposalId) => {
    setAcceptedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
    setRejectedProposalIds((prev) => {
      const next = new Set(prev);
      next.delete(proposalId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!organizationId || !spaceId) return;
    if (acceptedProposalIds.size === 0 && rejectedProposalIds.size === 0)
      return;

    const acceptProposals = selectedRecipeProposals
      .filter((p) => acceptedProposalIds.has(p.id))
      .map((p) => ({
        changeProposalId: p.id,
        recipeId: p.artefactId as RecipeId,
        force: false,
      }));

    const rejectProposals = selectedRecipeProposals
      .filter((p) => rejectedProposalIds.has(p.id))
      .map((p) => ({
        changeProposalId: p.id,
        recipeId: p.artefactId as RecipeId,
      }));

    const mutations: Promise<unknown>[] = [];

    if (acceptProposals.length > 0) {
      mutations.push(
        batchApplyMutation.mutateAsync({
          organizationId: organizationId as OrganizationId,
          spaceId: spaceId as SpaceId,
          proposals: acceptProposals,
        }),
      );
    }

    if (rejectProposals.length > 0) {
      mutations.push(
        batchRejectMutation.mutateAsync({
          organizationId: organizationId as OrganizationId,
          spaceId: spaceId as SpaceId,
          proposals: rejectProposals,
        }),
      );
    }

    try {
      await Promise.all(mutations);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_CHANGE_PROPOSALS_BY_RECIPE_KEY, recipeId],
        }),
      ]);

      setAcceptedProposalIds(new Set());
      setRejectedProposalIds(new Set());
      setReviewingProposalId(null);
    } catch {
      // Errors are handled by the mutation onError callbacks
    }
  }, [
    organizationId,
    spaceId,
    acceptedProposalIds,
    rejectedProposalIds,
    selectedRecipeProposals,
    batchApplyMutation,
    batchRejectMutation,
    queryClient,
  ]);

  const isMutating =
    batchApplyMutation.isPending || batchRejectMutation.isPending;

  const hasPooledDecisions =
    acceptedProposalIds.size > 0 || rejectedProposalIds.size > 0;

  return (
    <>
      <PMBox
        gridColumn="span 2"
        borderBottomWidth="1px"
        paddingX={4}
        paddingY={2}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
        minH="40px"
      >
        {hasPooledDecisions && (
          <PMHStack gap={2}>
            <PMText fontSize="sm" color="secondary">
              {acceptedProposalIds.size} accepted, {rejectedProposalIds.size}{' '}
              rejected
            </PMText>
            <PMButton
              size="sm"
              colorPalette="blue"
              disabled={isMutating}
              onClick={handleSave}
            >
              {isMutating ? 'Saving...' : 'Save'}
            </PMButton>
          </PMHStack>
        )}
      </PMBox>
      <PMBox minW={0} overflowY="auto" p={4}>
        {isLoadingProposals ? (
          <PMSpinner />
        ) : (
          <ChangeProposalsPreviewPanel
            recipe={
              selectedRecipe
                ? {
                    name: selectedRecipe.name,
                    content: selectedRecipe.content,
                  }
                : null
            }
            proposals={selectedRecipeProposals}
            reviewingProposalId={reviewingProposalId}
            acceptedProposalIds={acceptedProposalIds}
            rejectedProposalIds={rejectedProposalIds}
            onPoolAccept={handlePoolAccept}
            onPoolReject={handlePoolReject}
            onUndoPool={handleUndoPool}
            onReviewProposal={handleReviewProposal}
          />
        )}
      </PMBox>
      <PMBox borderLeftWidth="1px" p={4} overflowY="auto">
        <ChangeProposalsChangesList
          proposals={selectedRecipeProposals}
          reviewingProposalId={reviewingProposalId}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          userLookup={userLookup}
          onSelectProposal={handleReviewProposal}
          onPoolAccept={handlePoolAccept}
          onPoolReject={handlePoolReject}
          onUndoPool={handleUndoPool}
        />
      </PMBox>
    </>
  );
}

export default function ReviewChangesDetailRouteModule() {
  const { artefactType, artefactId } = useParams<{
    artefactType: string;
    artefactId: string;
  }>();

  if (!artefactType || !artefactId) return null;

  if (artefactType === 'commands') {
    return <CommandReviewDetail key={artefactId} artefactId={artefactId} />;
  }

  return (
    <PMBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="300px"
      gridColumn="span 2"
    >
      <PMText color="secondary">
        Review not yet supported for this artefact type
      </PMText>
    </PMBox>
  );
}
