import React, { useState } from 'react';
import {
  PMVStack,
  PMBox,
  PMHeading,
  PMField,
  PMInput,
  PMTextArea,
  PMButton,
  PMCheckbox,
  PMText,
  PMSpinner,
} from '@packmind/ui';
import { useNavigate } from 'react-router';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useCreatePackageMutation } from '../../api/queries/DeploymentsQueries';
import { RecipeId, StandardId, Recipe, Standard } from '@packmind/types';

export interface CreatePackagePageProps {
  organizationSlug: string;
  spaceSlug: string;
}

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
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<RecipeId[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = useState<StandardId[]>(
    [],
  );

  const handleRecipeToggle = (recipeId: RecipeId) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId],
    );
  };

  const handleStandardToggle = (standardId: StandardId) => {
    setSelectedStandardIds((prev) =>
      prev.includes(standardId)
        ? prev.filter((id) => id !== standardId)
        : [...prev, standardId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spaceId || !organizationId) {
      return;
    }

    try {
      await createPackageMutation.mutateAsync({
        spaceId,
        organizationId,
        name,
        slug,
        description,
        recipeIds: selectedRecipeIds,
        standardIds: selectedStandardIds,
      });

      navigate(`/org/${organizationSlug}/space/${spaceSlug}/packages`);
    } catch (error) {
      console.error('Failed to create package:', error);
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

  const recipes = recipesResponse || [];
  const standards = standardsResponse?.standards || [];

  return (
    <PMBox p={6} maxW="800px" mx="auto">
      <form onSubmit={handleSubmit}>
        <PMVStack align="stretch" gap={6}>
          <PMHeading size="lg">Create Package</PMHeading>

          <PMField.Root>
            <PMField.Label>Name *</PMField.Label>
            <PMInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter package name"
              required
            />
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Slug *</PMField.Label>
            <PMInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Enter package slug"
              required
            />
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Description *</PMField.Label>
            <PMTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter package description"
              required
              rows={4}
            />
          </PMField.Root>

          <PMBox>
            <PMText fontWeight="medium" mb={3}>
              Recipes
            </PMText>
            {recipes.length === 0 ? (
              <PMText colorPalette="gray" fontSize="sm">
                No recipes available in this space
              </PMText>
            ) : (
              <PMVStack align="stretch" gap={2}>
                {recipes.map((recipe: Recipe) => (
                  <PMCheckbox
                    key={recipe.id}
                    checked={selectedRecipeIds.includes(recipe.id)}
                    onCheckedChange={() => handleRecipeToggle(recipe.id)}
                  >
                    {recipe.name}
                  </PMCheckbox>
                ))}
              </PMVStack>
            )}
          </PMBox>

          <PMBox>
            <PMText fontWeight="medium" mb={3}>
              Standards
            </PMText>
            {standards.length === 0 ? (
              <PMText colorPalette="gray" fontSize="sm">
                No standards available in this space
              </PMText>
            ) : (
              <PMVStack align="stretch" gap={2}>
                {standards.map((standard: Standard) => (
                  <PMCheckbox
                    key={standard.id}
                    checked={selectedStandardIds.includes(standard.id)}
                    onCheckedChange={() => handleStandardToggle(standard.id)}
                  >
                    {standard.name}
                  </PMCheckbox>
                ))}
              </PMVStack>
            )}
          </PMBox>

          <PMBox display="flex" gap={4}>
            <PMButton
              type="submit"
              disabled={
                createPackageMutation.isPending ||
                !name ||
                !slug ||
                !description
              }
            >
              {createPackageMutation.isPending
                ? 'Creating...'
                : 'Create Package'}
            </PMButton>
            <PMButton
              variant="outline"
              onClick={() =>
                navigate(`/org/${organizationSlug}/space/${spaceSlug}/packages`)
              }
              type="button"
            >
              Cancel
            </PMButton>
          </PMBox>
        </PMVStack>
      </form>
    </PMBox>
  );
};
