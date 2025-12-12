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
  PMIconButton,
  PMCopiable,
  PMTooltip,
  PMEmptyState,
} from '@packmind/ui';
import { LuCopy } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import {
  useGetRecipeByIdQuery,
  useDeleteRecipeMutation,
} from '../api/queries/RecipesQueries';
import { RecipeVersionsListDrawer } from './RecipeVersionsListDrawer';
import { RecipeDistributionsList } from '../../deployments/components/RecipeDistributionsList/RecipeDistributionsList';
import { useListRecipeDistributionsQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { EditRecipe } from './EditRecipe';
import { AutobreadCrumb } from '../../../../src/shared/components/navigation/AutobreadCrumb';
import { RECIPE_MESSAGES } from '../constants/messages';
import { RecipeId } from '@packmind/types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

interface RecipeDetailsProps {
  id: RecipeId;
  orgSlug?: string;
  orgName?: string;
}

export const RecipeDetails = ({ id, orgSlug }: RecipeDetailsProps) => {
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { spaceSlug, spaceId } = useCurrentSpace();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { data: recipe, isLoading, isError, error } = useGetRecipeByIdQuery(id);
  const deleteMutation = useDeleteRecipeMutation();
  const { data: distributions, isLoading: isLoadingDistributions } =
    useListRecipeDistributionsQuery(id);
  const hasDistributions = distributions && distributions.length > 0;
  const defaultPath = `.packmind/recipes/${recipe?.slug}.md`;

  const handleDeleteRecipe = async () => {
    if (!recipe || !organization?.id || !spaceId) return;

    try {
      await deleteMutation.mutateAsync({
        organizationId: organization.id,
        spaceId,
        recipeId: recipe.id,
      });
      setDeleteAlert({
        type: 'success',
        message: RECIPE_MESSAGES.success.deleted,
      });
      setDeleteModalOpen(false);

      // Auto-dismiss success alert and navigate back after 2 seconds
      setTimeout(() => {
        setDeleteAlert(null);
        if (orgSlug && spaceSlug) {
          navigate(routes.space.toRecipes(orgSlug, spaceSlug));
        }
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
    if (!organization?.id || !spaceId) {
      return (
        <PMPage
          title="Cannot Edit Recipe"
          subtitle="Missing organization or space context"
          breadcrumbComponent={<AutobreadCrumb />}
        >
          <PMAlert.Root status="error" width="lg" mb={4}>
            <PMAlert.Indicator />
            <PMAlert.Title>
              Cannot edit recipe without organization and space context.
            </PMAlert.Title>
          </PMAlert.Root>
        </PMPage>
      );
    }

    return (
      <EditRecipe
        recipe={recipe}
        organizationId={organization.id}
        spaceId={spaceId}
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
      isFullWidth
      actions={
        <PMHStack gap={2}>
          <PMCopiable.Root value={recipe.content}>
            <PMTooltip label="Copy to clipboard">
              <PMCopiable.Trigger asChild>
                <PMIconButton aria-label="Copy to clipboard" variant="outline">
                  <PMCopiable.Indicator>
                    <LuCopy />
                  </PMCopiable.Indicator>
                </PMIconButton>
              </PMCopiable.Trigger>
            </PMTooltip>
          </PMCopiable.Root>
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
            onOpenChange={(details) => setDeleteModalOpen(details.open)}
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
              content: (
                <PMPageSection title="Instructions">
                  <PMBox
                    border="solid 1px"
                    borderColor="border.primary"
                    width={{ '2xl': '4xl', smToXl: 'full' }}
                  >
                    <MarkdownEditorProvider>
                      <MarkdownEditor defaultValue={recipe.content} readOnly />
                    </MarkdownEditorProvider>
                  </PMBox>
                </PMPageSection>
              ),
            },
            {
              value: 'deployments',
              triggerLabel: 'Distributions',
              content: isLoadingDistributions ? (
                <PMBox
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minH="200px"
                  marginTop={6}
                >
                  <PMSpinner size="lg" mr={2} />
                  <PMText ml={2}>Loading distributions...</PMText>
                </PMBox>
              ) : hasDistributions ? (
                <PMVStack align="stretch" gap={6} marginTop={6}>
                  <PMPageSection
                    title="Distribution"
                    backgroundColor="primary"
                    headingLevel="h4"
                    boxProps={{ width: 'xl' }}
                  >
                    <PMBox
                      marginTop={4}
                      padding={4}
                      border={'solid 1px'}
                      borderColor="border.secondary"
                      borderRadius="md"
                    >
                      <PMHeading level="h5">
                        Distributed file information
                      </PMHeading>
                      <PMDataList
                        my={2}
                        flexDirection={'row'}
                        size={'sm'}
                        gap={6}
                        items={[
                          { label: 'Path', value: defaultPath },
                          {
                            label: 'Scope',
                            value: <PMBox wordBreak="break-all">**/*</PMBox>,
                          },
                        ]}
                      />
                    </PMBox>
                  </PMPageSection>

                  <RecipeDistributionsList
                    recipeId={recipe.id}
                    orgSlug={orgSlug || ''}
                    spaceSlug={spaceSlug || ''}
                  />
                </PMVStack>
              ) : (
                <PMEmptyState
                  backgroundColor={'background.primary'}
                  borderRadius={'md'}
                  width={'2xl'}
                  mx={'auto'}
                  marginTop={6}
                  title={'No distributions yet'}
                  description="This recipe has not been distributed."
                />
              ),
            },
          ]}
        />
      </PMVStack>
    </PMPage>
  );
};
