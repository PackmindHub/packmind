import { useParams } from 'react-router';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMText,
  PMSpinner,
  PMButton,
  PMVStack,
} from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  Recipe,
  RecipeId,
  SpaceId,
  UserId,
} from '@packmind/types';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../src/domain/spaces/hooks/useCurrentSpace';
import { useGetRecipeByIdQuery } from '../../src/domain/recipes/api/queries/RecipesQueries';
import {
  useBatchApplyChangeProposalsMutation,
  useBatchRejectChangeProposalsMutation,
} from '../../src/domain/recipes/api/queries/ChangeProposalsQueries';
import {
  useApplyRecipeChangeProposalsMutation,
  useListChangeProposalsByRecipeQuery,
} from '../../src/domain/change-proposals/api/queries/ChangeProposalsQueries';
import {
  GET_CHANGE_PROPOSALS_BY_RECIPE_KEY,
  GET_GROUPED_CHANGE_PROPOSALS_KEY,
} from '../../src/domain/change-proposals/api/queryKeys';
import { useUserLookup } from '../../src/domain/change-proposals/hooks/useUserLookup';
import { ChangeProposalsChangesList } from '../../src/domain/change-proposals/components/ChangeProposals/ChangeProposalsChangesList';
import { InlineDiffContent } from '../../src/domain/change-proposals/components/InlineDiffContent';
import { getChangeProposalFieldLabel } from '../../src/domain/change-proposals/utils/changeProposalHelpers';
import { ChangeProposalWithConflicts } from '../../src/domain/change-proposals/types';
import { LuTriangleAlert } from 'react-icons/lu';
import { GET_RECIPE_BY_ID_KEY } from '../../src/domain/recipes/api/queryKeys';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function MiddlePanelContent({
  selectedRecipe,
  selectedRecipeProposals,
  reviewingProposalId,
  acceptedProposalIds,
  rejectedProposalIds,
  userLookup,
  onPoolAccept,
  onPoolReject,
  onUndoPool,
  onReviewProposal,
}: Readonly<{
  selectedRecipe: Recipe | undefined;
  selectedRecipeProposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  acceptedProposalIds: Set<ChangeProposalId>;
  rejectedProposalIds: Set<ChangeProposalId>;
  userLookup: Map<UserId, string>;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
  onUndoPool: (proposalId: ChangeProposalId) => void;
  onReviewProposal: (proposalId: ChangeProposalId) => void;
}>) {
  const reviewingProposal = reviewingProposalId
    ? (selectedRecipeProposals.find((p) => p.id === reviewingProposalId) ??
      null)
    : null;

  if (reviewingProposal) {
    return (
      <PMVStack gap={4} align="stretch">
        <PMBox
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
          p={4}
        >
          <PMVStack gap={2}>
            <PMHStack gap={2} justify="space-between" align="start">
              <PMVStack gap={1}>
                <PMText fontSize="lg" fontWeight="semibold">
                  {getChangeProposalFieldLabel(reviewingProposal.type)}
                </PMText>
                <PMHStack gap={4}>
                  <PMText fontSize="sm" color="secondary">
                    By{' '}
                    {userLookup.get(reviewingProposal.createdBy) ??
                      'Unknown user'}
                  </PMText>
                  <PMText fontSize="sm" color="secondary">
                    {formatDate(reviewingProposal.createdAt)}
                  </PMText>
                </PMHStack>
              </PMVStack>
              {reviewingProposal.conflictsWith.length > 0 && (
                <PMBadge colorPalette="orange" size="sm">
                  <LuTriangleAlert size={12} />
                  Outdated
                </PMBadge>
              )}
            </PMHStack>
          </PMVStack>
        </PMBox>
        <InlineDiffContent
          proposal={reviewingProposal}
          isReviewing={true}
          isAccepted={acceptedProposalIds.has(reviewingProposal.id)}
          isRejected={rejectedProposalIds.has(reviewingProposal.id)}
          onPoolAccept={() => onPoolAccept(reviewingProposal.id)}
          onPoolReject={() => onPoolReject(reviewingProposal.id)}
          onUndoPool={() => onUndoPool(reviewingProposal.id)}
          onReviewProposal={() => onReviewProposal(reviewingProposal.id)}
        />
      </PMVStack>
    );
  }

  if (!selectedRecipe) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="full"
      >
        <PMText color="secondary">
          Select a proposal to preview the change
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack gap={2} align="stretch">
      <PMText fontSize="lg" fontWeight="semibold">
        {selectedRecipe.name}
      </PMText>
      <PMText whiteSpace="pre-wrap">{selectedRecipe.content}</PMText>
    </PMVStack>
  );
}

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

  const applyRecipeChangeProposalsMutation =
    useApplyRecipeChangeProposalsMutation();

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
    selectedRecipeProposals,
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
          <MiddlePanelContent
            selectedRecipe={selectedRecipe}
            selectedRecipeProposals={selectedRecipeProposals}
            reviewingProposalId={reviewingProposalId}
            acceptedProposalIds={acceptedProposalIds}
            rejectedProposalIds={rejectedProposalIds}
            userLookup={userLookup}
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
