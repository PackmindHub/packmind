import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PMBox,
  PMVStack,
  PMHStack,
  PMFlex,
  PMText,
  PMSpinner,
  PMButton,
  PMGrid,
  PMPage,
} from '@packmind/ui';
import {
  ChangeProposalId,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import {
  useBatchApplyChangeProposalsMutation,
  useBatchRejectChangeProposalsMutation,
} from '../../../recipes/api/queries/ChangeProposalsQueries';
import {
  useGetGroupedChangeProposalsQuery,
  useListChangeProposalsByRecipeQuery,
} from '../../api/queries/ChangeProposalsQueries';
import { GET_GROUPED_CHANGE_PROPOSALS_KEY } from '../../api/queryKeys';
import { useUserLookup } from '../../hooks/useUserLookup';
import { ChangeProposalsSidebar } from './ChangeProposalsSidebar';
import { ChangeProposalsPreviewPanel } from './ChangeProposalsPreviewPanel';
import { ChangeProposalsChangesList } from './ChangeProposalsChangesList';

interface ChangeProposalsProps {
  breadcrumbComponent?: React.ReactNode;
}

export function ChangeProposals({ breadcrumbComponent }: ChangeProposalsProps) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const queryClient = useQueryClient();
  const userLookup = useUserLookup();

  const organizationId = organization?.id;

  // Grouped change proposals for the sidebar
  const {
    data: groupedProposals,
    isLoading: isLoadingGrouped,
    isError: isGroupedError,
  } = useGetGroupedChangeProposalsQuery();

  // Recipes query for getting recipe content (name + content) for the preview panel
  const { data: recipes } = useGetRecipesQuery();

  // State: selected command, reviewing proposal, and pool sets
  const [selectedCommandId, setSelectedCommandId] = useState<RecipeId | null>(
    null,
  );
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

  // Commands from grouped data
  const commands = useMemo(
    () => groupedProposals?.commands ?? [],
    [groupedProposals],
  );

  // Auto-select first command on load or when selected command is no longer available
  useEffect(() => {
    if (
      commands.length > 0 &&
      (!selectedCommandId ||
        !commands.some((c) => c.artefactId === selectedCommandId))
    ) {
      setSelectedCommandId(commands[0].artefactId);
      setReviewingProposalId(null);
    }
  }, [commands, selectedCommandId]);

  // Fetch proposals for the selected command
  const { data: selectedRecipeProposalsData, isLoading: isLoadingProposals } =
    useListChangeProposalsByRecipeQuery(selectedCommandId ?? undefined);

  // Extract proposals from response
  const selectedRecipeProposals = useMemo(
    () => selectedRecipeProposalsData?.changeProposals ?? [],
    [selectedRecipeProposalsData],
  );

  // Get the selected recipe from the recipes query (for content)
  const selectedRecipe = useMemo(
    () => recipes?.find((r) => r.id === selectedCommandId),
    [recipes, selectedCommandId],
  );

  // Handlers
  const handleSelectCommand = useCallback((commandId: RecipeId) => {
    setSelectedCommandId(commandId);
    setReviewingProposalId(null);
  }, []);

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

      // Also invalidate grouped change proposals (batch mutations already invalidate GET_CHANGE_PROPOSALS_KEY and GET_RECIPES_KEY)
      await queryClient.invalidateQueries({
        queryKey: GET_GROUPED_CHANGE_PROPOSALS_KEY,
      });

      // Clear pools
      setAcceptedProposalIds(new Set());
      setRejectedProposalIds(new Set());
      setReviewingProposalId(null);
    } catch (error) {
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

  if (isLoadingGrouped) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="200px"
      >
        <PMSpinner size="lg" mr={2} />
        <PMText ml={2}>Loading change proposals...</PMText>
      </PMBox>
    );
  }

  if (isGroupedError) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMVStack gap={4}>
          <PMText>Failed to load change proposals. Please try again.</PMText>
        </PMVStack>
      </PMBox>
    );
  }

  if (commands.length === 0) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMText>No pending change proposals to review.</PMText>
      </PMBox>
    );
  }

  return (
    <PMGrid
      height="full"
      gridTemplateColumns={{
        base: 'minmax(240px, 270px) minmax(0, 1fr)',
      }}
      alignItems="start"
      overflowX="auto"
    >
      <ChangeProposalsSidebar
        commands={commands}
        selectedCommandId={selectedCommandId}
        onSelectCommand={handleSelectCommand}
      />
      <PMPage breadcrumbComponent={breadcrumbComponent} isFullWidth>
        <PMBox
          position="sticky"
          top={0}
          zIndex={10}
          paddingY={3}
          display="flex"
          borderBottomWidth="1px"
          mb={2}
          justifyContent="flex-end"
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

        <PMFlex gap={6} direction={{ base: 'column', lg: 'row' }} flex={1}>
          <PMBox flex={1} minW={0}>
            {isLoadingProposals ? (
              <PMBox
                display="flex"
                alignItems="center"
                justifyContent="center"
                minH="200px"
              >
                <PMSpinner size="md" />
              </PMBox>
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
          <PMBox width={{ base: '100%', lg: '300px' }} flexShrink={0}>
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
        </PMFlex>
      </PMPage>
    </PMGrid>
  );
}
