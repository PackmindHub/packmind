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
  ChangeProposalType,
  OrganizationId,
  Recipe,
  RecipeId,
  ScalarUpdatePayload,
  SpaceId,
  UserId,
} from '@packmind/types';
import { diffWords } from 'diff';
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
import {
  getChangeProposalFieldLabel,
  getStatusBadgeProps,
} from '../../src/domain/change-proposals/utils/changeProposalHelpers';
import { formatRelativeTime } from '../../src/domain/change-proposals/utils/formatRelativeTime';
import { ChangeProposalWithConflicts } from '../../src/domain/change-proposals/types';
import { LuCheck, LuX } from 'react-icons/lu';
import { GET_RECIPE_BY_ID_KEY } from '../../src/domain/recipes/api/queryKeys';

function renderDiffText(oldValue: string, newValue: string) {
  const changes = diffWords(oldValue, newValue);
  return changes.map((change, i) => {
    if (change.added) {
      return (
        <PMText
          key={i}
          as="span"
          bg="green.subtle"
          paddingX={0.5}
          borderRadius="sm"
        >
          {change.value}
        </PMText>
      );
    }
    if (change.removed) {
      return (
        <PMText
          key={i}
          as="span"
          bg="red.subtle"
          textDecoration="line-through"
          paddingX={0.5}
          borderRadius="sm"
        >
          {change.value}
        </PMText>
      );
    }
    return (
      <PMText key={i} as="span">
        {change.value}
      </PMText>
    );
  });
}

function MiddlePanelContent({
  selectedRecipe,
  selectedRecipeProposals,
  reviewingProposalId,
  userLookup,
  onPoolAccept,
  onPoolReject,
}: Readonly<{
  selectedRecipe: Recipe | undefined;
  selectedRecipeProposals: ChangeProposalWithConflicts[];
  reviewingProposalId: ChangeProposalId | null;
  userLookup: Map<UserId, string>;
  onPoolAccept: (proposalId: ChangeProposalId) => void;
  onPoolReject: (proposalId: ChangeProposalId) => void;
}>) {
  const reviewingProposal = reviewingProposalId
    ? (selectedRecipeProposals.find((p) => p.id === reviewingProposalId) ??
      null)
    : null;

  if (reviewingProposal) {
    const statusBadge = getStatusBadgeProps(reviewingProposal.status);
    const payload = reviewingProposal.payload as ScalarUpdatePayload;

    const isNameDiff =
      reviewingProposal.type === ChangeProposalType.updateCommandName;
    const isDescriptionDiff =
      reviewingProposal.type === ChangeProposalType.updateCommandDescription;

    return (
      <PMVStack gap={4} align="stretch">
        {/* Header card */}
        <PMBox
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
          p={4}
        >
          <PMHStack justify="space-between" align="center">
            <PMHStack gap={3} align="center">
              <PMBadge colorPalette={statusBadge.colorPalette} size="sm">
                {statusBadge.label}
              </PMBadge>
              <PMText fontSize="sm" color="secondary">
                {formatRelativeTime(reviewingProposal.createdAt)}
              </PMText>
            </PMHStack>
            <PMHStack gap={2}>
              <PMButton
                size="sm"
                colorPalette="green"
                onClick={() => onPoolAccept(reviewingProposal.id)}
              >
                <LuCheck />
                Accept
              </PMButton>
              <PMButton
                size="sm"
                variant="outline"
                colorPalette="red"
                onClick={() => onPoolReject(reviewingProposal.id)}
              >
                <LuX />
                Dismiss
              </PMButton>
            </PMHStack>
          </PMHStack>
        </PMBox>

        {/* Proposal metadata */}
        <PMVStack gap={1} align="stretch">
          <PMText fontWeight="bold">
            {getChangeProposalFieldLabel(reviewingProposal.type)}
          </PMText>
          <PMHStack gap={1}>
            <PMText fontWeight="bold" fontSize="sm">
              From
            </PMText>
            <PMText fontSize="sm">
              {userLookup.get(reviewingProposal.createdBy) ?? 'Unknown user'}
            </PMText>
          </PMHStack>
          <PMHStack gap={1}>
            <PMText fontWeight="bold" fontSize="sm">
              Base version
            </PMText>
            <PMText fontSize="sm">{reviewingProposal.artefactVersion}</PMText>
          </PMHStack>
        </PMVStack>

        {/* Full artefact content with inline diff */}
        {selectedRecipe && (
          <PMVStack gap={2} align="stretch">
            <PMText fontSize="lg" fontWeight="semibold">
              {isNameDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedRecipe.name}
            </PMText>
            <PMText whiteSpace="pre-wrap">
              {isDescriptionDiff
                ? renderDiffText(payload.oldValue, payload.newValue)
                : selectedRecipe.content}
            </PMText>
          </PMVStack>
        )}
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
            userLookup={userLookup}
            onPoolAccept={handlePoolAccept}
            onPoolReject={handlePoolReject}
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
