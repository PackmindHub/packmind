import { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import {
  PMPage,
  PMBox,
  PMVStack,
  PMHStack,
  PMText,
  PMSpinner,
  PMButton,
  PMBadge,
  PMCheckbox,
} from '@packmind/ui';
import {
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  ChangeProposalWithOutdatedStatus,
  OrganizationId,
  RecipeId,
  ScalarUpdatePayload,
  SpaceId,
} from '@packmind/types';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../src/domain/spaces/hooks/useCurrentSpace';
import { useGetRecipesQuery } from '../../src/domain/recipes/api/queries/RecipesQueries';
import {
  getChangeProposalsByRecipeIdOptions,
  useBatchApplyChangeProposalsMutation,
  useBatchRejectChangeProposalsMutation,
} from '../../src/domain/recipes/api/queries/ChangeProposalsQueries';
import { getChangeProposalFieldLabel } from '../../src/domain/recipes/utils/changeProposalHelpers';
import { DiffHighlight } from '../../src/domain/recipes/components/DiffHighlight';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink
        to={routes.space.toChangeProposals(params.orgSlug, params.spaceSlug)}
      >
        Changes to review
      </NavLink>
    );
  },
};

export default function ChangeProposalsReviewPage() {
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

  if (isLoadingRecipes || isLoadingProposals) {
    return (
      <PMPage
        title="Changes to review"
        subtitle="Review and manage proposed changes across all commands"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading change proposals...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isRecipesError) {
    return (
      <PMPage
        title="Error"
        subtitle="Failed to load data"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <PMText>Failed to load change proposals. Please try again.</PMText>
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  if (recipesWithPendingProposals.length === 0) {
    return (
      <PMPage
        title="Changes to review"
        subtitle="Review and manage proposed changes across all commands"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMText>No pending change proposals to review.</PMText>
        </PMBox>
      </PMPage>
    );
  }

  const isMutating =
    batchApplyMutation.isPending || batchRejectMutation.isPending;

  return (
    <PMPage
      title="Changes to review"
      subtitle="Review and manage proposed changes across all commands"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMBox
        display="grid"
        gridTemplateColumns="280px 1fr 360px"
        gap={4}
        height="calc(100vh - 200px)"
      >
        {/* Left panel - Command list */}
        <PMBox
          overflowY="auto"
          borderRight="1px solid"
          borderColor="gray.200"
          pr={2}
        >
          <PMVStack gap={1}>
            {recipesWithPendingProposals.map((recipe) => {
              const pendingCount =
                proposalsByRecipeId.get(recipe.id)?.length ?? 0;
              const isSelected = recipe.id === selectedRecipeId;

              return (
                <PMBox
                  key={recipe.id}
                  p={3}
                  cursor="pointer"
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderLeftColor={isSelected ? 'blue.500' : 'transparent'}
                  bg={isSelected ? 'blue.50' : 'transparent'}
                  _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
                  onClick={() => handleSelectRecipe(recipe.id)}
                >
                  <PMHStack justifyContent="space-between">
                    <PMText
                      fontSize="sm"
                      fontWeight={isSelected ? 'semibold' : 'normal'}
                      truncate
                    >
                      {recipe.name}
                    </PMText>
                    <PMBadge colorPalette="blue" size="sm">
                      {pendingCount}
                    </PMBadge>
                  </PMHStack>
                </PMBox>
              );
            })}
          </PMVStack>
        </PMBox>

        {/* Center panel - Command content / diff preview */}
        <PMBox overflowY="auto" px={4}>
          {selectedRecipe ? (
            <PMVStack gap={4} align="stretch">
              <PMBox>
                <PMText fontSize="xs" color="gray.500" mb={1}>
                  Command name
                </PMText>
                {focusedProposal?.type ===
                ChangeProposalType.updateCommandName ? (
                  <DiffHighlight
                    oldText={
                      (focusedProposal.payload as ScalarUpdatePayload).oldValue
                    }
                    newText={
                      (focusedProposal.payload as ScalarUpdatePayload).newValue
                    }
                  />
                ) : (
                  <PMText fontSize="lg" fontWeight="semibold">
                    {selectedRecipe.name}
                  </PMText>
                )}
              </PMBox>
              <PMBox>
                <PMText fontSize="xs" color="gray.500" mb={1}>
                  Command description
                </PMText>
                {focusedProposal?.type ===
                ChangeProposalType.updateCommandDescription ? (
                  <DiffHighlight
                    oldText={
                      (focusedProposal.payload as ScalarUpdatePayload).oldValue
                    }
                    newText={
                      (focusedProposal.payload as ScalarUpdatePayload).newValue
                    }
                  />
                ) : (
                  <PMText whiteSpace="pre-wrap">
                    {selectedRecipe.content}
                  </PMText>
                )}
              </PMBox>
            </PMVStack>
          ) : (
            <PMBox
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <PMText color="gray.400">
                Select a command to view its content
              </PMText>
            </PMBox>
          )}
        </PMBox>

        {/* Right panel - Proposals list + actions */}
        <PMBox
          display="flex"
          flexDirection="column"
          borderLeft="1px solid"
          borderColor="gray.200"
          pl={2}
        >
          <PMBox overflowY="auto" flex={1}>
            <PMVStack gap={1}>
              {selectedRecipeProposals.map((proposal) => {
                const payload = proposal.payload as ScalarUpdatePayload;
                const isChecked = selectedProposalIds.has(proposal.id);
                const isFocused = focusedProposalId === proposal.id;

                return (
                  <PMBox
                    key={proposal.id}
                    p={2}
                    borderRadius="md"
                    bg={isFocused ? 'blue.50' : 'transparent'}
                    _hover={{ bg: isFocused ? 'blue.50' : 'gray.50' }}
                    cursor="pointer"
                    onClick={() => handleFocusProposal(proposal.id)}
                  >
                    <PMHStack gap={2} align="start">
                      <PMBox onClick={(e) => e.stopPropagation()} pt={1}>
                        <PMCheckbox
                          checked={isChecked}
                          onCheckedChange={(e) =>
                            handleToggleProposal(
                              proposal.id,
                              e.checked === true,
                            )
                          }
                        />
                      </PMBox>
                      <PMVStack gap={0} flex={1} minW={0}>
                        <PMText fontSize="sm" fontWeight="medium">
                          {getChangeProposalFieldLabel(proposal.type)}
                        </PMText>
                        <PMText fontSize="xs" color="gray.500" truncate>
                          {truncateValue(payload.oldValue)} {'->'}{' '}
                          {truncateValue(payload.newValue)}
                        </PMText>
                      </PMVStack>
                    </PMHStack>
                  </PMBox>
                );
              })}
              {selectedRecipeProposals.length === 0 && (
                <PMBox py={4} textAlign="center">
                  <PMText color="gray.400" fontSize="sm">
                    No pending proposals for this command
                  </PMText>
                </PMBox>
              )}
            </PMVStack>
          </PMBox>

          {/* Action bar */}
          {selectedRecipeProposals.length > 0 && (
            <PMBox borderTop="1px solid" borderColor="gray.200" pt={3} pb={1}>
              <PMHStack gap={2}>
                <PMButton
                  size="sm"
                  colorPalette="green"
                  disabled={selectedProposalIds.size === 0 || isMutating}
                  onClick={handleBatchApply}
                  flex={1}
                >
                  Apply ({selectedProposalIds.size})
                </PMButton>
                <PMButton
                  size="sm"
                  colorPalette="red"
                  variant="outline"
                  disabled={selectedProposalIds.size === 0 || isMutating}
                  onClick={handleBatchReject}
                  flex={1}
                >
                  Reject ({selectedProposalIds.size})
                </PMButton>
              </PMHStack>
            </PMBox>
          )}
        </PMBox>
      </PMBox>
    </PMPage>
  );
}

function truncateValue(value: string, maxLength = 40): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + '...';
}
