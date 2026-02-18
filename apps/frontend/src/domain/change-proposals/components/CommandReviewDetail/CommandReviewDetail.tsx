import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PMBox, PMButton, PMHStack, PMSpinner, PMText } from '@packmind/ui';
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
import { ChangeProposalsChangesList } from '../ChangeProposals/ChangeProposalsChangesList';
import { GET_RECIPE_BY_ID_KEY } from '../../../recipes/api/queryKeys';
import { ProposalReviewPanel } from './ProposalReviewPanel';
import { useParams } from 'react-router';

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

  const [reviewingProposalId, setReviewingProposalId] =
    useState<ChangeProposalId | null>(null);
  const [acceptedProposalIds, setAcceptedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());
  const [rejectedProposalIds, setRejectedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());

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

  const blockedByConflictIds = useMemo(() => {
    const blocked = new Set<ChangeProposalId>();
    for (const id of acceptedProposalIds) {
      const proposal = selectedRecipeProposals.find((p) => p.id === id);
      if (proposal) {
        for (const conflictId of proposal.conflictsWith) {
          blocked.add(conflictId);
        }
      }
    }
    return blocked;
  }, [acceptedProposalIds, selectedRecipeProposals]);

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

    try {
      await applyRecipeChangeProposalsMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        artefactId: recipeId,
        accepted: Array.from(acceptedProposalIds),
        rejected: Array.from(rejectedProposalIds),
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: [...GET_CHANGE_PROPOSALS_BY_RECIPE_KEY, recipeId],
        }),
        queryClient.invalidateQueries({
          queryKey: [GET_RECIPE_BY_ID_KEY, recipeId],
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
    applyRecipeChangeProposalsMutation,
    queryClient,
  ]);

  const isMutating = applyRecipeChangeProposalsMutation.isPending;

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
          <ProposalReviewPanel
            selectedRecipe={selectedRecipe}
            selectedRecipeProposals={selectedRecipeProposals}
            reviewingProposalId={reviewingProposalId}
            acceptedProposalIds={acceptedProposalIds}
            rejectedProposalIds={rejectedProposalIds}
            blockedByConflictIds={blockedByConflictIds}
            userLookup={userLookup}
            onPoolAccept={handlePoolAccept}
            onPoolReject={handlePoolReject}
            onUndoPool={handleUndoPool}
          />
        )}
      </PMBox>
      <PMBox borderLeftWidth="1px" p={4} overflowY="auto">
        <ChangeProposalsChangesList
          proposals={selectedRecipeProposals}
          reviewingProposalId={reviewingProposalId}
          acceptedProposalIds={acceptedProposalIds}
          rejectedProposalIds={rejectedProposalIds}
          blockedByConflictIds={blockedByConflictIds}
          currentArtefactVersion={selectedRecipe?.version}
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
