import React, { useState, useEffect } from 'react';
import {
  PMPage,
  PMText,
  PMBox,
  PMVStack,
  PMAlert,
  PMSpinner,
  PMHeading,
  PMHStack,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMLink,
  PMButton,
  PMField,
  PMFieldset,
  PMInput,
  PMAlertDialog,
  pmToaster,
  PMMarkdownViewer,
  PMCombobox,
  PMPortal,
  pmUseFilter,
  pmUseListCollection,
  PMBadge,
  PMCloseButton,
  PMDataList,
  PMTabs,
  PMEmptyState,
} from '@packmind/ui';
import { Link, useNavigate } from 'react-router';
import {
  useGetPackageByIdQuery,
  useUpdatePackageMutation,
  useDeletePackagesBatchMutation,
  useListPackageDeploymentsQuery,
} from '../../api/queries/DeploymentsQueries';
import { AutobreadCrumb } from '../../../../shared/components/navigation/AutobreadCrumb';
import {
  PackageId,
  Recipe,
  Standard,
  RecipeId,
  StandardId,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';
import { RemovePackageFromTargetsButton } from '../RemovePackageFromTargets';
import { PackageDistributionList } from '../PackageDistributionList';
import {
  MarkdownEditor,
  MarkdownEditorProvider,
} from '../../../../shared/components/editor/MarkdownEditor';
import { CopiableTextField } from '../../../../shared/components/inputs/CopiableTextField';

interface PackageDetailsProps {
  id: PackageId;
  orgSlug: string;
  spaceSlug: string;
}

interface PackageEditFormContentProps {
  allRecipes: Recipe[];
  allStandards: Standard[];
  selectedRecipeIds: RecipeId[];
  selectedStandardIds: StandardId[];
  setSelectedRecipeIds: (ids: RecipeId[]) => void;
  setSelectedStandardIds: (ids: StandardId[]) => void;
  isPending: boolean;
  isLoadingRecipes: boolean;
  isLoadingStandards: boolean;
  orgSlug: string;
  spaceSlug: string;
}

const PackageEditFormContent = ({
  allRecipes,
  allStandards,
  selectedRecipeIds,
  selectedStandardIds,
  setSelectedRecipeIds,
  setSelectedStandardIds,
  isPending,
  isLoadingRecipes,
  isLoadingStandards,
  orgSlug,
  spaceSlug,
}: PackageEditFormContentProps) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const recipeItems = allRecipes.map((recipe: Recipe) => ({
    label: recipe.name,
    value: recipe.id,
  }));

  const standardItems = allStandards.map((standard: Standard) => ({
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
      ? 'Select commands...'
      : `${selectedRecipeIds.length} command(s) selected`;

  const standardDisplayValue =
    selectedStandardIds.length === 0
      ? 'Select standards...'
      : `${selectedStandardIds.length} standard(s) selected`;

  return (
    <PMHStack align="flex-start" gap={4} width="full">
      <PMField.Root flex={1} width="full">
        <PMField.Label>Standards</PMField.Label>
        {isLoadingStandards || allStandards.length === 0 ? (
          isLoadingStandards ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No standards available in this space
            </PMText>
          )
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
                    const standard = allStandards.find(
                      (s) => s.id === standardId,
                    );
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
                      <Link
                        to={routes.space.toStandard(orgSlug, spaceSlug, id)}
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
                      </Link>
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
        <PMField.Label>Commands</PMField.Label>
        {isLoadingRecipes || allRecipes.length === 0 ? (
          isLoadingRecipes ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No commands available in this space
            </PMText>
          )
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
                    const recipe = allRecipes.find((r) => r.id === recipeId);
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
                      <Link
                        to={routes.space.toCommand(orgSlug, spaceSlug, id)}
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
                      </Link>
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

export const PackageDetails = ({
  id,
  orgSlug,
  spaceSlug,
}: PackageDetailsProps) => {
  const navigate = useNavigate();
  const { organization, user } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<RecipeId[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = useState<StandardId[]>(
    [],
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const {
    data: packageResponse,
    isLoading,
    isError,
    error,
  } = useGetPackageByIdQuery(id, spaceId, organization?.id);

  const { data: recipesResponse, isLoading: isLoadingRecipes } =
    useGetRecipesQuery();

  const { data: standardsResponse, isLoading: isLoadingStandards } =
    useGetStandardsQuery();

  const { data: deployments = [], isLoading: isLoadingDeployments } =
    useListPackageDeploymentsQuery(id);

  const { data: providersResponse } = useGetGitProvidersQuery();
  const hasGitProviderWithToken =
    providersResponse?.providers?.some((p) => p.hasToken) ?? false;

  const updatePackageMutation = useUpdatePackageMutation();
  const deletePackageMutation = useDeletePackagesBatchMutation();

  const pkg = packageResponse?.package;
  const recipeIds = pkg?.recipes || [];
  const standardIds = pkg?.standards || [];
  const allRecipes = (recipesResponse || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const allStandards = (standardsResponse?.standards || []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  useEffect(() => {
    if (pkg) {
      setEditName(pkg.name);
      setEditDescription(pkg.description);
      setSelectedRecipeIds(recipeIds);
      setSelectedStandardIds(standardIds);
    }
  }, [pkg, recipeIds, standardIds]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    if (pkg) {
      setEditName(pkg.name);
      setEditDescription(pkg.description);
      setSelectedRecipeIds(recipeIds);
      setSelectedStandardIds(standardIds);
    }
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!spaceId || !organization?.id) {
      return;
    }

    if (updatePackageMutation.isPending || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePackageMutation.mutateAsync({
        packageId: id,
        spaceId,
        organizationId: organization.id,
        name: editName,
        description: editDescription,
        recipeIds: selectedRecipeIds,
        standardIds: selectedStandardIds,
      });

      pmToaster.create({
        type: 'success',
        title: 'Package updated successfully',
        description: `"${editName}" has been updated`,
      });

      setIsEditMode(false);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Failed to update package:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the package';
      pmToaster.create({
        type: 'error',
        title: 'Failed to update package',
        description: errorMessage,
      });
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!spaceId || !organization?.id) {
      return;
    }

    try {
      await deletePackageMutation.mutateAsync({
        packageIds: [id],
        spaceId,
        organizationId: organization.id,
      });
      navigate(routes.space.toPackages(orgSlug, spaceSlug));
    } catch (error) {
      console.error('Failed to delete package:', error);
    }
  };

  // Don't create collections until data is loaded
  const recipeItems = !isLoadingRecipes
    ? allRecipes.map((recipe: Recipe) => ({
        label: recipe.name,
        value: recipe.id,
      }))
    : [];

  const standardItems = !isLoadingStandards
    ? allStandards.map((standard: Standard) => ({
        label: standard.name,
        value: standard.id,
      }))
    : [];

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

  const recipeTableData: PMTableRow[] = React.useMemo(() => {
    const rows: PMTableRow[] = [];
    for (const recipeId of recipeIds) {
      const recipe = allRecipes.find((r) => r.id === recipeId);
      if (recipe) {
        rows.push({
          key: recipeId,
          name: (
            <PMLink asChild>
              <Link to={routes.space.toCommand(orgSlug, spaceSlug, recipeId)}>
                {recipe.name}
              </Link>
            </PMLink>
          ),
          sortName: recipe.name,
        });
      }
    }
    return rows.sort((a, b) =>
      (a.sortName as string).localeCompare(b.sortName as string),
    );
  }, [recipeIds, allRecipes, orgSlug, spaceSlug]);

  const standardTableData: PMTableRow[] = React.useMemo(() => {
    const rows: PMTableRow[] = [];
    for (const standardId of standardIds) {
      const standard = allStandards.find((s) => s.id === standardId);
      if (standard) {
        rows.push({
          key: standardId,
          name: (
            <PMLink asChild>
              <Link
                to={routes.space.toStandard(orgSlug, spaceSlug, standardId)}
              >
                {standard.name}
              </Link>
            </PMLink>
          ),
          sortName: standard.name,
        });
      }
    }
    return rows.sort((a, b) =>
      (a.sortName as string).localeCompare(b.sortName as string),
    );
  }, [standardIds, allStandards, orgSlug, spaceSlug]);

  const recipeColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Name', grow: true }],
    [],
  );

  const standardColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Name', grow: true }],
    [],
  );

  if (isLoading) {
    return (
      <PMPage
        title="Loading Package..."
        subtitle="Please wait while we fetch the package details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="200px"
        >
          <PMSpinner size="lg" mr={2} />
          <PMText ml={2}>Loading package details...</PMText>
        </PMBox>
      </PMPage>
    );
  }

  if (isError) {
    return (
      <PMPage
        title="Error Loading Package"
        subtitle="Sorry, we couldn't load the package details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMAlert.Root status="error" width="lg" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>There was an error loading the package.</PMAlert.Title>
          {error && <PMText color="error">Error: {String(error)}</PMText>}
        </PMAlert.Root>
      </PMPage>
    );
  }

  if (!pkg) {
    return (
      <PMPage
        title="Package Not Found"
        subtitle="The package you're looking for doesn't exist"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <PMText>This package could not be found.</PMText>
        </PMBox>
      </PMPage>
    );
  }

  const recipeCount = recipeTableData.length;
  const standardCount = standardTableData.length;
  const isPackageEmpty = recipeCount === 0 && standardCount === 0;

  const isPending = updatePackageMutation.isPending || isSubmitting;
  const isFormValid = editName.trim();

  if (isEditMode) {
    if (isLoadingRecipes || isLoadingStandards) {
      return (
        <PMPage
          title="Edit Package"
          subtitle="Loading..."
          breadcrumbComponent={<AutobreadCrumb />}
        >
          <PMBox
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="200px"
          >
            <PMSpinner size="lg" mr={2} />
            <PMText ml={2}>Loading commands and standards...</PMText>
          </PMBox>
        </PMPage>
      );
    }

    return (
      <PMPage
        title="Edit Package"
        subtitle="Update package details, commands, and standards"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <MarkdownEditorProvider>
          <PMBox
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
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
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isPending}
                    />
                    <PMField.HelperText />
                    <PMField.ErrorText />
                  </PMField.Root>

                  <PMField.Root maxW="100%">
                    <PMField.Label>Description</PMField.Label>
                    <PMBox width="100%">
                      <MarkdownEditor
                        defaultValue={editDescription}
                        onMarkdownChange={(value: string): void => {
                          setEditDescription(value);
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
                  Select the commands and standards to include in this package.
                </PMFieldset.HelperText>
                <PMFieldset.Content
                  border="solid 1px"
                  borderColor="border.primary"
                  p={4}
                >
                  {isLoadingRecipes || isLoadingStandards ? null : (
                    <PackageEditFormContent
                      key={`loaded-${allRecipes.length}-${allStandards.length}`}
                      allRecipes={allRecipes}
                      allStandards={allStandards}
                      selectedRecipeIds={selectedRecipeIds}
                      selectedStandardIds={selectedStandardIds}
                      setSelectedRecipeIds={setSelectedRecipeIds}
                      setSelectedStandardIds={setSelectedStandardIds}
                      isPending={isPending}
                      isLoadingRecipes={isLoadingRecipes}
                      isLoadingStandards={isLoadingStandards}
                      orgSlug={orgSlug}
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
                {isPending ? 'Saving...' : 'Save'}
              </PMButton>
              <PMButton
                variant="secondary"
                onClick={handleCancel}
                type="button"
                disabled={isPending}
                size="lg"
              >
                Cancel
              </PMButton>
            </PMHStack>

            {updatePackageMutation.isError && (
              <PMAlert.Root status="error">
                <PMAlert.Indicator />
                <PMAlert.Title>Failed to update package</PMAlert.Title>
                <PMText>Please try again.</PMText>
              </PMAlert.Root>
            )}
          </PMBox>
        </MarkdownEditorProvider>
      </PMPage>
    );
  }

  const pullCommand = `packmind-cli pull ${pkg.slug}`;

  return (
    <PMPage
      title={pkg.name}
      breadcrumbComponent={<AutobreadCrumb />}
      isFullWidth
      actions={
        <PMHStack gap={3}>
          {hasGitProviderWithToken && (
            <DeployPackageButton
              label="Distribute"
              size="md"
              selectedPackages={[pkg]}
            />
          )}
          <RemovePackageFromTargetsButton
            selectedPackage={pkg}
            distributions={deployments}
            distributionsLoading={isLoadingDeployments}
            size="md"
          />
          <PMButton variant="tertiary" onClick={handleEdit}>
            Edit
          </PMButton>
          <PMAlertDialog
            trigger={
              <PMButton variant="tertiary" colorPalette="red">
                Delete
              </PMButton>
            }
            title="Delete Package"
            message={PACKAGE_MESSAGES.confirmation.deletePackage(pkg.name)}
            confirmText="Delete"
            cancelText="Cancel"
            confirmColorScheme="red"
            onConfirm={handleDelete}
            open={deleteDialogOpen}
            onOpenChange={({ open }) => setDeleteDialogOpen(open)}
            isLoading={deletePackageMutation.isPending}
          />
        </PMHStack>
      }
    >
      <PMTabs
        defaultValue="content"
        tabs={[
          {
            value: 'content',
            triggerLabel: 'Content',
            content: (
              <PMVStack align="stretch" gap="6" pt={4}>
                <PMHStack gap={8} align="center" justifyContent="space-between">
                  <PMDataList
                    size="md"
                    orientation="horizontal"
                    items={[
                      {
                        label: 'Slug',
                        value: <PMText>{pkg.slug}</PMText>,
                      },
                    ]}
                  />
                  <PMHStack
                    gap={2}
                    align="center"
                    flexGrow={1}
                    justifyContent="flex-end"
                  >
                    <PMText variant="small" color="primary" fontWeight="medium">
                      Install package
                    </PMText>
                    <CopiableTextField
                      value={pullCommand}
                      readOnly
                      width="auto"
                    />
                  </PMHStack>
                </PMHStack>
                {pkg.description && (
                  <PMBox>
                    <PMMarkdownViewer content={pkg.description} />
                  </PMBox>
                )}

                {isPackageEmpty ? (
                  <PMEmptyState
                    backgroundColor={'background.primary'}
                    borderRadius={'md'}
                    width={'2xl'}
                    mx={'auto'}
                    mt={8}
                    title={'This package is empty'}
                    description="Add commands and standards to this package to distribute them to your repositories"
                  >
                    <PMHStack>
                      <PMButton variant="secondary" onClick={handleEdit}>
                        Edit Package
                      </PMButton>
                    </PMHStack>
                  </PMEmptyState>
                ) : (
                  <PMHStack align="flex-start" gap={6} width="full">
                    {standardCount > 0 && (
                      <PMBox flex={1} width="full">
                        <PMHeading size="lg" mb={4}>
                          Standards ({standardCount})
                        </PMHeading>
                        <PMTable
                          columns={standardColumns}
                          data={standardTableData}
                          striped={true}
                          hoverable={true}
                          variant="line"
                        />
                      </PMBox>
                    )}

                    {recipeCount > 0 && (
                      <PMBox flex={1} width="full">
                        <PMHeading size="lg" mb={4}>
                          Commands ({recipeCount})
                        </PMHeading>
                        <PMTable
                          columns={recipeColumns}
                          data={recipeTableData}
                          striped={true}
                          hoverable={true}
                          variant="line"
                        />
                      </PMBox>
                    )}
                  </PMHStack>
                )}
              </PMVStack>
            ),
          },
          {
            value: 'distributions',
            triggerLabel: 'Distributions',
            content: (
              <PMBox pt={4}>
                <PackageDistributionList packageId={id} />
              </PMBox>
            ),
          },
        ]}
      />
    </PMPage>
  );
};
