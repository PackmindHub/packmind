import React, { useState } from 'react';
import {
  PMPage,
  PMButton,
  PMMarkdownViewer,
  PMText,
  PMPageSection,
  PMBox,
  PMHStack,
  PMVStack,
  PMBadge,
  PMAlert,
  PMDialog,
} from '@packmind/ui';
import { useNavigate, Link } from 'react-router';
import {
  useGetRecipeByIdQuery,
  useDeleteRecipeMutation,
} from '../api/queries/RecipesQueries';
import { RecipeVersionsList } from './RecipeVersionsList';
import { RecipeDeploymentsList } from '../../deployments/components/RecipeDeploymentsList/RecipeDeploymentsList';
import { DeployRecipeButton } from './DeployRecipeButton';
import { EditRecipe } from './EditRecipe';
import { useDeployRecipe } from '../../deployments/hooks';
import { RecipeId } from '@packmind/recipes/types';
import { GitRepoId } from '@packmind/git/types';
import { AutobreadCrumb } from '../../../../src/shared/components/navigation/AutobreadCrumb';
import { RECIPE_MESSAGES } from '../constants/messages';

interface RecipeDetailsProps {
  id: RecipeId;
  orgSlug?: string;
  orgName?: string;
}

export const RecipeDetails = ({ id, orgSlug, orgName }: RecipeDetailsProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { data: recipe, isLoading, isError, error } = useGetRecipeByIdQuery(id);
  const deleteMutation = useDeleteRecipeMutation();
  const { deployRecipe, isDeploying } = useDeployRecipe();

  const handleDeploy = async (repositoryIds: GitRepoId[]) => {
    if (!recipe) return;

    await deployRecipe(
      {
        id: recipe.id,
        version: recipe.version,
        name: recipe.name,
      },
      repositoryIds,
    );
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;

    try {
      await deleteMutation.mutateAsync(recipe.id);
      setDeleteAlert({
        type: 'success',
        message: RECIPE_MESSAGES.success.deleted,
      });
      setDeleteDialogOpen(false);

      // Auto-dismiss success alert and navigate back after 2 seconds
      setTimeout(() => {
        setDeleteAlert(null);
        navigate(orgSlug ? `/org/${orgSlug}/recipes` : '/recipes');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      setDeleteAlert({
        type: 'error',
        message: RECIPE_MESSAGES.error.deleteFailed,
      });
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <PMPage
        title="Loading Recipe..."
        subtitle="Please wait while we fetch the recipe details"
        breadcrumbComponent={<AutobreadCrumb />}
        LinkComponent={Link}
      >
        <PMBox>
          <PMText>Loading recipe details...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isError) {
    return (
      <PMPage
        title="Error Loading Recipe"
        subtitle="Sorry, we couldn't load the recipe details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <PMText>There was an error loading the recipe.</PMText>
          {error && <PMText color="error">Error: {error.message}</PMText>}
        </PMBox>
      </PMPage>
    );
  }

  if (!recipe) {
    return (
      <PMPage
        title="Recipe Not Found"
        subtitle="The recipe you're looking for doesn't exist"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <PMText>This recipe could not be found.</PMText>
        </PMBox>
      </PMPage>
    );
  }

  // Show edit form when in edit mode
  if (isEditing) {
    return (
      <EditRecipe
        recipe={recipe}
        onCancel={() => setIsEditing(false)}
        onSuccess={() => {
          setIsEditing(false);
          // Recipe data will be automatically refreshed due to query invalidation
        }}
      />
    );
  }

  return (
    <PMPage
      title={recipe.name}
      subtitle={`Recipe version ${recipe.version}`}
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <PMHStack gap={2}>
          <DeployRecipeButton
            label={`Deploy v${recipe.version}`}
            onDeploy={handleDeploy}
            loading={isDeploying}
            disabled={!recipe}
          />
          <PMButton variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </PMButton>
          <PMButton
            variant="outline"
            colorScheme="red"
            onClick={() => setDeleteDialogOpen(true)}
            loading={deleteMutation.isPending}
          >
            Delete
          </PMButton>
        </PMHStack>
      }
    >
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      <PMVStack align="stretch" gap={6}>
        <PMBox>
          <PMHStack gap={4} mb={4}>
            <PMBadge colorScheme="blue">Slug: {recipe.slug}</PMBadge>
            <PMBadge colorScheme="green">Version: {recipe.version}</PMBadge>
          </PMHStack>
        </PMBox>

        <PMPageSection title="Instructions" variant="outline">
          <PMMarkdownViewer content={recipe.content} />
        </PMPageSection>

        <RecipeVersionsList recipeId={recipe.id} />
        <RecipeDeploymentsList recipeId={recipe.id} />
      </PMVStack>

      {/* Delete Confirmation Dialog */}
      <PMDialog.Root
        open={deleteDialogOpen}
        onOpenChange={({ open }) => setDeleteDialogOpen(open)}
      >
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Delete Recipe</PMDialog.Title>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText>
                {recipe &&
                  RECIPE_MESSAGES.confirmation.deleteRecipe(recipe.name)}
              </PMText>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </PMButton>
              <PMButton
                colorScheme="red"
                onClick={handleDeleteRecipe}
                loading={deleteMutation.isPending}
              >
                Delete
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
    </PMPage>
  );
};
