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
  PMAlert,
  PMAlertDialog,
  PMDataList,
  PMTabs,
  PMSpinner,
  PMHeading,
} from '@packmind/ui';
import { useNavigate } from 'react-router';
import {
  useGetRecipeByIdQuery,
  useDeleteRecipeMutation,
} from '../api/queries/RecipesQueries';
import { RecipeVersionsListDrawer } from './RecipeVersionsListDrawer';
import { RecipeDeploymentsList } from '../../deployments/components/RecipeDeploymentsList/RecipeDeploymentsList';
import { DeployRecipeButton } from './DeployRecipeButton';
import { EditRecipe } from './EditRecipe';
import { AutobreadCrumb } from '../../../../src/shared/components/navigation/AutobreadCrumb';
import { RECIPE_MESSAGES } from '../constants/messages';
import { RecipeId } from '@packmind/shared';

interface RecipeDetailsProps {
  id: RecipeId;
  orgSlug?: string;
  orgName?: string;
}

export const RecipeDetails = ({ id, orgSlug, orgName }: RecipeDetailsProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { data: recipe, isLoading, isError, error } = useGetRecipeByIdQuery(id);
  const deleteMutation = useDeleteRecipeMutation();
  const defaultPath = `.packmind/recipes/${recipe?.slug}.md`;

  const handleDeleteRecipe = async () => {
    if (!recipe) return;

    try {
      await deleteMutation.mutateAsync(recipe.id);
      setDeleteAlert({
        type: 'success',
        message: RECIPE_MESSAGES.success.deleted,
      });
      setDeleteModalOpen(false);

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
      setDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <PMPage
        title="Loading Recipe..."
        subtitle="Please wait while we fetch the recipe details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading recipe details...</PMText>
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
        <PMAlert.Root status="error" width="lg" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>There was an error loading the recipe.</PMAlert.Title>
          {error && <PMText color="error">Error: {error.message}</PMText>}
        </PMAlert.Root>
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
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <PMHStack gap={2}>
          <PMButton variant="primary" onClick={() => setIsEditing(true)}>
            Edit
          </PMButton>
          <PMAlertDialog
            trigger={
              <PMButton variant="tertiary" loading={deleteMutation.isPending}>
                Delete
              </PMButton>
            }
            title="Delete Recipe"
            message={
              recipe
                ? RECIPE_MESSAGES.confirmation.deleteRecipe(recipe.name)
                : 'Are you sure you want to delete this recipe?'
            }
            confirmText="Delete"
            cancelText="Cancel"
            confirmColorScheme="red"
            onConfirm={handleDeleteRecipe}
            open={deleteModalOpen}
            onOpenChange={setDeleteModalOpen}
            isLoading={deleteMutation.isPending}
          />
        </PMHStack>
      }
    >
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMAlert.Root status={deleteAlert.type} width="lg" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
        </PMAlert.Root>
      )}

      <PMVStack align="stretch" gap={6}>
        <PMDataList
          size="md"
          orientation="horizontal"
          items={[
            {
              label: 'Version',
              value: (
                <PMHStack>
                  {recipe.version}
                  <RecipeVersionsListDrawer recipeId={recipe.id} />
                </PMHStack>
              ),
            },
          ]}
        />

        <PMTabs
          defaultValue="instructions"
          tabs={[
            {
              value: 'instructions',
              triggerLabel: 'Instructions',
              content: <PMMarkdownViewer content={recipe.content} />,
            },
            {
              value: 'deployments',
              triggerLabel: 'Deployments',
              content: (
                <PMVStack align="flex-start" gap={6} marginTop={6}>
                  <PMPageSection
                    title="Run deployment"
                    backgroundColor="primary"
                    headingLevel="h4"
                    cta={
                      <DeployRecipeButton
                        label={`Deploy v${recipe.version}`}
                        disabled={!recipe}
                        selectedRecipes={[recipe]}
                        size="sm"
                        variant="secondary"
                      />
                    }
                  >
                    <PMBox
                      marginTop={4}
                      padding={4}
                      border={'solid 1px'}
                      borderColor="border.secondary"
                      borderRadius="md"
                    >
                      <PMHeading level="h5">
                        Deployed file information
                      </PMHeading>
                      <PMDataList
                        my={2}
                        flexDirection={'row'}
                        size={'sm'}
                        gap={6}
                        items={[
                          { label: 'Path', value: defaultPath },
                          { label: 'Scope', value: '**/*' },
                        ]}
                      />
                    </PMBox>
                  </PMPageSection>

                  <RecipeDeploymentsList recipeId={recipe.id} />
                </PMVStack>
              ),
            },
          ]}
        />
      </PMVStack>
    </PMPage>
  );
};
