import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueries } from '@tanstack/react-query';
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
  ChangeProposalStatus,
  ChangeProposalWithOutdatedStatus,
  OrganizationId,
  RecipeId,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import {
  getChangeProposalsByRecipeIdOptions,
  useBatchApplyChangeProposalsMutation,
  useBatchRejectChangeProposalsMutation,
} from '../../../recipes/api/queries/ChangeProposalsQueries';
import { ChangeProposalsSidebar } from './ChangeProposalsSidebar';
import { ChangeProposalsPreviewPanel } from './ChangeProposalsPreviewPanel';
import { ChangeProposalsChangesList } from './ChangeProposalsChangesList';

interface ChangeProposalsProps {
  breadcrumbComponent?: React.ReactNode;
}

export function ChangeProposals({ breadcrumbComponent }: ChangeProposalsProps) {
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const organizationId = organization?.id;

  const {
    data: recipes,
    isLoading: isLoadingRecipes,
    isError: isRecipesError,
  } = useGetRecipesQuery();

  const [selectedRecipeId, setSelectedRecipeId] = useState<RecipeId | null>(
    null,
  );
  const [selectedProposalIds, setSelectedProposalIds] = useState<
    Set<ChangeProposalId>
  >(new Set());
  const [focusedProposalId, setFocusedProposalId] =
    useState<ChangeProposalId | null>(null);

  const batchApplyMutation = useBatchApplyChangeProposalsMutation();
  const batchRejectMutation = useBatchRejectChangeProposalsMutation();

  // Fetch proposals for all recipes
  const proposalsQueries = useQueries({
    queries: (recipes ?? []).map((recipe) =>
      getChangeProposalsByRecipeIdOptions(organizationId, spaceId, recipe.id),
    ),
  });

  // Build a map: recipeId -> pending proposals
  const proposalsByRecipeId = useMemo(() => {
    const map = new Map<RecipeId, ChangeProposalWithOutdatedStatus[]>();
    if (!recipes) return map;

    recipes.forEach((recipe, index) => {
      const queryResult = proposalsQueries[index];
      if (queryResult?.data) {
        const pendingProposals = queryResult.data.filter(
          (p) => p.status === ChangeProposalStatus.pending,
        );
        if (pendingProposals.length > 0) {
          map.set(recipe.id, pendingProposals);
        }
      }
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, ...proposalsQueries.map((q) => q.data)]);

  // Build a map: recipeId -> proposal count
  const proposalCountsByRecipeId = useMemo(() => {
    const counts = new Map<RecipeId, number>();
    proposalsByRecipeId.forEach((proposals, recipeId) => {
      counts.set(recipeId, proposals.length);
    });
    return counts;
  }, [proposalsByRecipeId]);

  // Recipes that have pending proposals
  const recipesWithPendingProposals = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter((recipe) => proposalsByRecipeId.has(recipe.id));
  }, [recipes, proposalsByRecipeId]);

  // Auto-select first command on load
  useEffect(() => {
    if (
      recipesWithPendingProposals.length > 0 &&
      (!selectedRecipeId ||
        !recipesWithPendingProposals.some((r) => r.id === selectedRecipeId))
    ) {
      setSelectedRecipeId(recipesWithPendingProposals[0].id);
      setSelectedProposalIds(new Set());
      setFocusedProposalId(null);
    }
  }, [recipesWithPendingProposals, selectedRecipeId]);

  const selectedRecipe = useMemo(
    () => recipes?.find((r) => r.id === selectedRecipeId),
    [recipes, selectedRecipeId],
  );

  const selectedRecipeProposals = useMemo(
    () =>
      selectedRecipeId ? (proposalsByRecipeId.get(selectedRecipeId) ?? []) : [],
    [selectedRecipeId, proposalsByRecipeId],
  );

  const focusedProposal = useMemo(
    () =>
      focusedProposalId
        ? selectedRecipeProposals.find((p) => p.id === focusedProposalId)
        : null,
    [focusedProposalId, selectedRecipeProposals],
  );

  const handleSelectRecipe = useCallback((recipeId: RecipeId) => {
    setSelectedRecipeId(recipeId);
    setSelectedProposalIds(new Set());
    setFocusedProposalId(null);
  }, []);

  const handleToggleProposal = useCallback(
    (proposalId: ChangeProposalId, checked: boolean) => {
      setSelectedProposalIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(proposalId);
        } else {
          next.delete(proposalId);
        }
        return next;
      });
    },
    [],
  );

  const handleFocusProposal = useCallback((proposalId: ChangeProposalId) => {
    setFocusedProposalId((prev) => (prev === proposalId ? null : proposalId));
  }, []);

  const handleBatchApply = useCallback(() => {
    if (!organizationId || !spaceId || selectedProposalIds.size === 0) return;

    const proposals = selectedRecipeProposals
      .filter((p) => selectedProposalIds.has(p.id))
      .map((p) => ({
        changeProposalId: p.id,
        recipeId: p.artefactId as RecipeId,
        force: false,
      }));

    batchApplyMutation.mutate(
      {
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        proposals,
      },
      {
        onSuccess: () => {
          setSelectedProposalIds(new Set());
          setFocusedProposalId(null);
        },
      },
    );
  }, [
    organizationId,
    spaceId,
    selectedProposalIds,
    selectedRecipeProposals,
    batchApplyMutation,
  ]);

  const handleBatchReject = useCallback(() => {
    if (!organizationId || !spaceId || selectedProposalIds.size === 0) return;

    const proposals = selectedRecipeProposals
      .filter((p) => selectedProposalIds.has(p.id))
      .map((p) => ({
        changeProposalId: p.id,
        recipeId: p.artefactId as RecipeId,
      }));

    batchRejectMutation.mutate(
      {
        organizationId: organizationId as OrganizationId,
        spaceId: spaceId as SpaceId,
        proposals,
      },
      {
        onSuccess: () => {
          setSelectedProposalIds(new Set());
          setFocusedProposalId(null);
        },
      },
    );
  }, [
    organizationId,
    spaceId,
    selectedProposalIds,
    selectedRecipeProposals,
    batchRejectMutation,
  ]);

  const isLoadingProposals = proposalsQueries.some((q) => q.isLoading);

  const isMutating =
    batchApplyMutation.isPending || batchRejectMutation.isPending;

  if (isLoadingRecipes || isLoadingProposals) {
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

  if (isRecipesError) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMVStack gap={4}>
          <PMText>Failed to load change proposals. Please try again.</PMText>
        </PMVStack>
      </PMBox>
    );
  }

  if (recipesWithPendingProposals.length === 0) {
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
        recipes={recipesWithPendingProposals}
        proposalCounts={proposalCountsByRecipeId}
        selectedRecipeId={selectedRecipeId}
        onSelectRecipe={handleSelectRecipe}
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
          {selectedRecipeProposals.length > 0 && (
            <PMHStack gap={2}>
              <PMButton
                size="sm"
                colorPalette="green"
                disabled={selectedProposalIds.size === 0 || isMutating}
                onClick={handleBatchApply}
              >
                Apply ({selectedProposalIds.size})
              </PMButton>
              <PMButton
                size="sm"
                colorPalette="red"
                variant="outline"
                disabled={selectedProposalIds.size === 0 || isMutating}
                onClick={handleBatchReject}
              >
                Reject ({selectedProposalIds.size})
              </PMButton>
            </PMHStack>
          )}
        </PMBox>

        <PMFlex gap={6} direction={{ base: 'column', lg: 'row' }} flex={1}>
          <PMBox flex={1} minW={0}>
            <ChangeProposalsPreviewPanel
              recipe={
                selectedRecipe
                  ? {
                      name: selectedRecipe.name,
                      content: selectedRecipe.content,
                    }
                  : null
              }
              focusedProposal={focusedProposal ?? null}
            />
          </PMBox>
          <PMBox width={{ base: '100%', lg: '300px' }} flexShrink={0}>
            <ChangeProposalsChangesList
              proposals={selectedRecipeProposals}
              selectedProposalIds={selectedProposalIds}
              focusedProposalId={focusedProposalId}
              onToggleProposal={handleToggleProposal}
              onFocusProposal={handleFocusProposal}
            />
          </PMBox>
        </PMFlex>
      </PMPage>
    </PMGrid>
  );
}
