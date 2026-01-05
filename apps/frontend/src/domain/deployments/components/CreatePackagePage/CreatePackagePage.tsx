import React, { useState, useMemo } from 'react';
import {
  PMVStack,
  PMBox,
  PMHeading,
  PMField,
  PMFieldset,
  PMInput,
  PMButton,
  PMText,
  PMSpinner,
  PMHStack,
  pmToaster,
  PMCombobox,
  PMPortal,
  pmUseFilter,
  pmUseListCollection,
  PMBadge,
  PMCloseButton,
} from '@packmind/ui';
import { useNavigate, NavLink } from 'react-router';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useCreatePackageMutation } from '../../api/queries/DeploymentsQueries';
import { RecipeId, StandardId, Recipe, Standard } from '@packmind/types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { routes } from '../../../../shared/utils/routes';

export interface CreatePackagePageProps {
  organizationSlug: string;
  spaceSlug: string;
}

interface PackageFormContentProps {
  recipes: Recipe[];
  standards: Standard[];
  selectedRecipeIds: RecipeId[];
  selectedStandardIds: StandardId[];
  setSelectedRecipeIds: (ids: RecipeId[]) => void;
  setSelectedStandardIds: (ids: StandardId[]) => void;
  isPending: boolean;
  organizationSlug: string;
  spaceSlug: string;
}

const PackageFormContent = ({
  recipes,
  standards,
  selectedRecipeIds,
  selectedStandardIds,
  setSelectedRecipeIds,
  setSelectedStandardIds,
  isPending,
  organizationSlug,
  spaceSlug,
}: PackageFormContentProps) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const recipeItems = recipes.map((recipe: Recipe) => ({
    label: recipe.name,
    value: recipe.id,
  }));

  const standardItems = standards.map((standard: Standard) => ({
    label: standard.name,
    value: standard.id,
  }));

  const { collection: recipeCollection, filter: filterRecipes } =
    pmUseListCollection({
      initialItems: recipeItems,
      filter: contains,
    });

  const { collection: standardCollection, filter: filterStandards } =
    pmUseListCollection({
      initialItems: standardItems,
      filter: contains,
    });

  const recipeDisplayValue =
    selectedRecipeIds.length === 0
      ? 'Select recipes...'
      : `${selectedRecipeIds.length} recipe(s) selected`;

  const standardDisplayValue =
    selectedStandardIds.length === 0
      ? 'Select standards...'
      : `${selectedStandardIds.length} standard(s) selected`;

  return (
    <PMHStack align="flex-start" gap={4} width="full">
      <PMField.Root flex={1} width="full">
        <PMField.Label>Standards</PMField.Label>
        {standards.length === 0 ? (
          <PMText colorPalette="gray" fontSize="sm" display="block">
            No standards available in this space
          </PMText>
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={standardCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterStandards(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedStandardIds(details.value as StandardId[])
              }
              value={selectedStandardIds}
              multiple
              openOnClick
              placeholder={standardDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No standards found</PMCombobox.Empty>
                    {standardCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedStandardIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedStandardIds
                  .map((standardId) => {
                    const standard = standards.find((s) => s.id === standardId);
                    return standard
                      ? { id: standardId, name: standard.name }
                      : null;
                  })
                  .filter(
                    (item): item is { id: StandardId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <NavLink
                        to={routes.space.toStandard(
                          organizationSlug,
                          spaceSlug,
                          id,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <PMText truncate title={name}>
                          {name}
                        </PMText>
                      </NavLink>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedStandardIds(
                            selectedStandardIds.filter(
                              (standardId) => standardId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>

      <PMField.Root flex={1} width="full">
        <PMField.Label>Recipes</PMField.Label>
        {recipes.length === 0 ? (
          <PMText colorPalette="gray" fontSize="sm" display="block">
            No recipes available in this space
          </PMText>
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={recipeCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterRecipes(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedRecipeIds(details.value as RecipeId[])
              }
              value={selectedRecipeIds}
              multiple
              openOnClick
              placeholder={recipeDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No recipes found</PMCombobox.Empty>
                    {recipeCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedRecipeIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedRecipeIds
                  .map((recipeId) => {
                    const recipe = recipes.find((r) => r.id === recipeId);
                    return recipe ? { id: recipeId, name: recipe.name } : null;
                  })
                  .filter(
                    (item): item is { id: RecipeId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <NavLink
                        to={routes.space.toCommand(
                          organizationSlug,
                          spaceSlug,
                          id,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <PMText truncate title={name}>
                          {name}
                        </PMText>
                      </NavLink>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedRecipeIds(
                            selectedRecipeIds.filter(
                              (recipeId) => recipeId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>
    </PMHStack>
  );
};

export const CreatePackagePage: React.FC<CreatePackagePageProps> = ({
  organizationSlug,
  spaceSlug,
}) => {
  const navigate = useNavigate();
  const { spaceId, space, isLoading: isLoadingSpace } = useCurrentSpace();
  const organizationId = space?.organizationId;

  const {
    data: recipesResponse,
    isLoading: isLoadingRecipes,
    error: recipesError,
  } = useGetRecipesQuery();

  const {
    data: standardsResponse,
    isLoading: isLoadingStandards,
    error: standardsError,
  } = useGetStandardsQuery();

  const createPackageMutation = useCreatePackageMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<RecipeId[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = useState<StandardId[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const recipes = (recipesResponse || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const standards = (standardsResponse?.standards || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spaceId || !organizationId) {
      return;
    }

    if (createPackageMutation.isPending || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createPackageMutation.mutateAsync({
        spaceId,
        organizationId,
        name,
        description,
        recipeIds: selectedRecipeIds,
        standardIds: selectedStandardIds,
      });

      pmToaster.create({
        type: 'success',
        title: 'Package created successfully',
        description: `"${name}" has been created`,
      });

      navigate(`/org/${organizationSlug}/space/${spaceSlug}/packages`);
    } catch (error) {
      console.error('Failed to create package:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while creating the package';
      pmToaster.create({
        type: 'error',
        title: 'Failed to create package',
        description: errorMessage,
      });
      setIsSubmitting(false);
    }
  };

  if (isLoadingSpace || isLoadingRecipes || isLoadingStandards) {
    return (
      <PMBox display="flex" justifyContent="center" alignItems="center" p={8}>
        <PMSpinner size="lg" />
      </PMBox>
    );
  }

  if (recipesError || standardsError) {
    return (
      <PMBox p={4}>
        <PMText color="error">
          Error loading data:{' '}
          {String(recipesError || standardsError || 'Unknown error')}
        </PMText>
      </PMBox>
    );
  }

  const isPending = createPackageMutation.isPending || isSubmitting;
  const isFormValid = name.trim();

  return (
    <MarkdownEditorProvider>
      <PMBox as="form" onSubmit={handleSubmit}>
        <PMVStack gap={10} alignItems="flex-start">
          <PMFieldset.Root>
            <PMFieldset.Legend>
              <PMHeading level="h3">Package Information</PMHeading>
            </PMFieldset.Legend>
            <PMFieldset.Content
              border="solid 1px"
              borderColor="border.primary"
              p={4}
            >
              <PMField.Root required>
                <PMField.Label>
                  Name
                  <PMField.RequiredIndicator />
                </PMField.Label>
                <PMInput
                  placeholder="Enter package name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                />
                <PMField.HelperText />
                <PMField.ErrorText />
              </PMField.Root>

              <PMField.Root maxW="100%">
                <PMField.Label>Description</PMField.Label>
                <PMBox width="100%">
                  <MarkdownEditor
                    defaultValue={description}
                    onMarkdownChange={(value: string): void => {
                      setDescription(value);
                    }}
                  />
                </PMBox>
                <PMField.HelperText />
                <PMField.ErrorText />
              </PMField.Root>
            </PMFieldset.Content>
          </PMFieldset.Root>

          <PMFieldset.Root>
            <PMFieldset.Legend>
              <PMHeading level="h3">Content Selection</PMHeading>
            </PMFieldset.Legend>
            <PMFieldset.HelperText>
              Select the recipes and standards to include in this package.
            </PMFieldset.HelperText>
            <PMFieldset.Content
              border="solid 1px"
              borderColor="border.primary"
              p={4}
            >
              {isLoadingRecipes || isLoadingStandards ? null : (
                <PackageFormContent
                  key={`loaded-${recipes.length}-${standards.length}`}
                  recipes={recipes}
                  standards={standards}
                  selectedRecipeIds={selectedRecipeIds}
                  selectedStandardIds={selectedStandardIds}
                  setSelectedRecipeIds={setSelectedRecipeIds}
                  setSelectedStandardIds={setSelectedStandardIds}
                  isPending={isPending}
                  organizationSlug={organizationSlug}
                  spaceSlug={spaceSlug}
                />
              )}
            </PMFieldset.Content>
          </PMFieldset.Root>
        </PMVStack>

        <PMHStack
          marginTop={6}
          border="solid 1px"
          borderColor="border.primary"
          paddingY={4}
          justifyContent="center"
          backgroundColor="background.secondary"
          position="sticky"
          bottom={0}
        >
          <PMButton
            type="submit"
            variant="primary"
            disabled={!isFormValid || isPending}
            loading={isPending}
            size="lg"
          >
            {isPending ? 'Creating...' : 'Create Package'}
          </PMButton>
          <PMButton
            variant="secondary"
            onClick={() =>
              navigate(`/org/${organizationSlug}/space/${spaceSlug}/packages`)
            }
            type="button"
            disabled={isPending}
            size="lg"
          >
            Cancel
          </PMButton>
        </PMHStack>
      </PMBox>
    </MarkdownEditorProvider>
  );
};
