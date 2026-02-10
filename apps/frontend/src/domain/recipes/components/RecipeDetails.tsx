import React, { useState } from 'react';
import {
  PMPage,
  PMButton,
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
  PMFeatureFlag,
  DEFAULT_FEATURE_DOMAIN_MAP,
  CHANGE_PROPOSALS_FEATURE_KEY,
  PMLink,
  PMBadge,
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
import { useGetChangeProposalsQuery } from '../api/queries/ChangeProposalsQueries';
import { AutobreadCrumb } from '../../../../src/shared/components/navigation/AutobreadCrumb';
import { RECIPE_MESSAGES } from '../constants/messages';
import { ChangeProposalStatus, RecipeId } from '@packmind/types';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../shared/components/editor/MarkdownEditor';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../shared/utils/routes';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useNavigation } from '../../../shared/hooks/useNavigation';
import { ProposeChangeModal } from './ProposeChangeModal';
import { ProposeDescriptionChangeModal } from './ProposeDescriptionChangeModal';

interface RecipeDetailsProps {
  id: RecipeId;
  orgSlug?: string;
  orgName?: string;
}

export const RecipeDetails = ({ id, orgSlug }: RecipeDetailsProps) => {
  const navigate = useNavigate();
  const nav = useNavigation();
  const { organization, user } = useAuthContext();
  const { spaceSlug, spaceId } = useCurrentSpace();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposeChangeOpen, setProposeChangeOpen] = useState(false);
  const [proposeDescriptionChangeOpen, setProposeDescriptionChangeOpen] =
    useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const { data: recipe, isLoading, isError, error } = useGetRecipeByIdQuery(id);
  const deleteMutation = useDeleteRecipeMutation();
  const { data: distributions, isLoading: isLoadingDistributions } =
    useListRecipeDistributionsQuery(id);
  const { data: changeProposals } = useGetChangeProposalsQuery(id);
  const hasDistributions = distributions && distributions.length > 0;
  const pendingCount =
    changeProposals?.filter((p) => p.status === ChangeProposalStatus.pending)
      .length ?? 0;
  const defaultPath = `.packmind/recipes/${recipe?.slug}.md`;

  const handleDeleteRecipe = async () => {
    if (!recipe || !organization?.id || !spaceId) return;

    try {
      await deleteMutation.mutateAsync({
        organizationId: organization.id,
        spaceId,
        recipeId: recipe.id,
      });
      setDeleteModalOpen(false);

      // Navigate immediately after successful deletion
      if (orgSlug && spaceSlug) {
        navigate(routes.space.toCommands(orgSlug, spaceSlug));
      }
    } catch (error) {
      console.error('Failed to delete command:', error);
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
        title="Loading Command..."
        subtitle="Please wait while we fetch the command details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading command details...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  // Skip error state if deletion was successful (query will 404 after deletion)
  if (isError && !deleteMutation.isSuccess) {
    return (
      <PMPage
        title="Error Loading Command"
        subtitle="Sorry, we couldn't load the command details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMAlert.Root status="error" width="lg" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>There was an error loading the command.</PMAlert.Title>
          {error && <PMText color="error">Error: {error.message}</PMText>}
        </PMAlert.Root>
      </PMPage>
    );
  }

  if (!recipe) {
    return (
      <PMPage
        title="Command Not Found"
        subtitle="The command you're looking for doesn't exist"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <PMText>This command could not be found.</PMText>
        </PMBox>
      </PMPage>
    );
  }

  const handleEditClick = () => {
    nav.space.toEditCommand(recipe.id);
  };

  return (
    <PMPage
      title={recipe.name}
      titleAction={
        <PMFeatureFlag
          featureKeys={[CHANGE_PROPOSALS_FEATURE_KEY]}
          featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
          userEmail={user?.email}
        >
          <PMLink
            onClick={() => setProposeChangeOpen(true)}
            cursor="pointer"
            fontSize={'xs'}
            variant="underline"
          >
            Propose change
          </PMLink>
        </PMFeatureFlag>
      }
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
          <PMFeatureFlag
            featureKeys={[CHANGE_PROPOSALS_FEATURE_KEY]}
            featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
            userEmail={user?.email}
          >
            {pendingCount > 0 && (
              <PMButton
                variant="tertiary"
                onClick={() =>
                  navigate(
                    routes.space.toCommandChangeProposals(
                      orgSlug || '',
                      spaceSlug || '',
                      recipe.id,
                    ),
                  )
                }
              >
                <PMHStack gap={2}>
                  Changes to review
                  <PMBadge>{pendingCount}</PMBadge>
                </PMHStack>
              </PMButton>
            )}
          </PMFeatureFlag>
          <PMButton variant="primary" onClick={handleEditClick}>
            Edit
          </PMButton>
          <PMAlertDialog
            trigger={
              <PMButton variant="tertiary" loading={deleteMutation.isPending}>
                Delete
              </PMButton>
            }
            title="Delete Command"
            message={
              recipe
                ? RECIPE_MESSAGES.confirmation.deleteRecipe(recipe.name)
                : 'Are you sure you want to delete this command?'
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
      {/* Delete Error Alert */}
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
              label: 'Slug',
              value: recipe.slug,
            },
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
                  <PMFeatureFlag
                    featureKeys={[CHANGE_PROPOSALS_FEATURE_KEY]}
                    featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
                    userEmail={user?.email}
                  >
                    <PMLink
                      onClick={() => setProposeDescriptionChangeOpen(true)}
                      cursor="pointer"
                      fontSize="xs"
                      variant="underline"
                    >
                      Propose change
                    </PMLink>
                  </PMFeatureFlag>
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

      {recipe && organization?.id && spaceId && (
        <>
          <ProposeChangeModal
            recipeName={recipe.name}
            recipeId={recipe.id}
            organizationId={organization.id}
            spaceId={spaceId}
            open={proposeChangeOpen}
            onOpenChange={(details) => setProposeChangeOpen(details.open)}
          />
          <ProposeDescriptionChangeModal
            recipeDescription={recipe.content}
            recipeId={recipe.id}
            organizationId={organization.id}
            spaceId={spaceId}
            open={proposeDescriptionChangeOpen}
            onOpenChange={(details) =>
              setProposeDescriptionChangeOpen(details.open)
            }
          />
        </>
      )}
    </PMPage>
  );
};
