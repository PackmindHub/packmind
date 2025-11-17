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
  PMInput,
  PMTextArea,
  PMCheckbox,
  PMAlertDialog,
} from '@packmind/ui';
import { Link, useNavigate } from 'react-router';
import {
  useGetPackageByIdQuery,
  useUpdatePackageMutation,
  useDeletePackagesBatchMutation,
} from '../../api/queries/DeploymentsQueries';
import { AutobreadCrumb } from '../../../../shared/components/navigation/AutobreadCrumb';
import {
  PackageId,
  Recipe,
  Standard,
  RecipeId,
  StandardId,
  Package,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { routes } from '../../../../shared/utils/routes';
import { useGetRecipesQuery } from '../../../recipes/api/queries/RecipesQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';

interface PackageDetailsProps {
  id: PackageId;
  orgSlug: string;
  spaceSlug: string;
}

export const PackageDetails = ({
  id,
  orgSlug,
  spaceSlug,
}: PackageDetailsProps) => {
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { spaceId } = useCurrentSpace();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<RecipeId[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = useState<StandardId[]>(
    [],
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const updatePackageMutation = useUpdatePackageMutation();
  const deletePackageMutation = useDeletePackagesBatchMutation();

  const pkg = packageResponse?.package;
  const recipeIds = pkg?.recipes || [];
  const standardIds = pkg?.standards || [];
  const allRecipes = recipesResponse || [];
  const allStandards = standardsResponse?.standards || [];

  useEffect(() => {
    if (pkg && !isEditMode) {
      setEditName(pkg.name);
      setEditDescription(pkg.description);
      setSelectedRecipeIds(recipeIds);
      setSelectedStandardIds(standardIds);
    }
  }, [pkg, recipeIds, standardIds, isEditMode]);

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
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update package:', error);
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

  const recipeTableData: PMTableRow[] = React.useMemo(
    () =>
      recipeIds.map((recipeId) => {
        const recipe = allRecipes.find((r) => r.id === recipeId);
        return {
          key: recipeId,
          name: (
            <PMLink asChild>
              <Link to={routes.space.toRecipe(orgSlug, spaceSlug, recipeId)}>
                {recipe?.name || recipeId}
              </Link>
            </PMLink>
          ),
        };
      }),
    [recipeIds, allRecipes, orgSlug, spaceSlug],
  );

  const standardTableData: PMTableRow[] = React.useMemo(
    () =>
      standardIds.map((standardId) => {
        const standard = allStandards.find((s) => s.id === standardId);
        return {
          key: standardId,
          name: (
            <PMLink asChild>
              <Link
                to={routes.space.toStandard(orgSlug, spaceSlug, standardId)}
              >
                {standard?.name || standardId}
              </Link>
            </PMLink>
          ),
        };
      }),
    [standardIds, allStandards, orgSlug, spaceSlug],
  );

  const recipeColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Recipe Name', grow: true }],
    [],
  );

  const standardColumns: PMTableColumn[] = React.useMemo(
    () => [{ key: 'name', header: 'Standard Name', grow: true }],
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

  const recipeCount = recipeIds.length;
  const standardCount = standardIds.length;
  const isPackageEmpty = recipeCount === 0 && standardCount === 0;

  if (isEditMode) {
    return (
      <PMPage
        title="Edit Package"
        subtitle="Update package details, recipes, and standards"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMVStack align="stretch" gap="6" maxW="800px">
          <PMField.Root>
            <PMField.Label>Name *</PMField.Label>
            <PMInput
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter package name"
              required
            />
          </PMField.Root>

          <PMField.Root>
            <PMField.Label>Description *</PMField.Label>
            <PMTextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter package description"
              required
              rows={4}
            />
          </PMField.Root>

          <PMBox>
            <PMText fontWeight="medium" mb={3}>
              Recipes
            </PMText>
            {isLoadingRecipes ? (
              <PMSpinner size="sm" />
            ) : allRecipes.length === 0 ? (
              <PMText colorPalette="gray" fontSize="sm">
                No recipes available in this space
              </PMText>
            ) : (
              <PMVStack align="stretch" gap={2}>
                {allRecipes.map((recipe: Recipe) => (
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
            {isLoadingStandards ? (
              <PMSpinner size="sm" />
            ) : allStandards.length === 0 ? (
              <PMText colorPalette="gray" fontSize="sm">
                No standards available in this space
              </PMText>
            ) : (
              <PMVStack align="stretch" gap={2}>
                {allStandards.map((standard: Standard) => (
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

          <PMHStack gap={3}>
            <PMButton
              onClick={handleSave}
              disabled={
                updatePackageMutation.isPending || !editName || !editDescription
              }
            >
              {updatePackageMutation.isPending ? 'Saving...' : 'Save'}
            </PMButton>
            <PMButton
              variant="outline"
              onClick={handleCancel}
              disabled={updatePackageMutation.isPending}
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
        </PMVStack>
      </PMPage>
    );
  }

  return (
    <PMPage
      title={pkg.name}
      subtitle={pkg.description}
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <PMHStack gap={3}>
          <DeployPackageButton
            label="Deploy"
            size="md"
            selectedPackages={[pkg]}
            disabled={isPackageEmpty}
          />
          <PMButton onClick={handleEdit}>Edit</PMButton>
          <PMAlertDialog
            trigger={
              <PMButton variant="outline" colorPalette="red">
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
      <PMVStack align="stretch" gap="6">
        <PMBox>
          <PMVStack align="stretch" gap="2">
            <PMHStack gap="4">
              <PMText fontWeight="semibold">Slug:</PMText>
              <PMText>{pkg.slug}</PMText>
            </PMHStack>
            <PMHStack gap="4">
              <PMText fontWeight="semibold">Recipes:</PMText>
              <PMText>{recipeCount}</PMText>
            </PMHStack>
            <PMHStack gap="4">
              <PMText fontWeight="semibold">Standards:</PMText>
              <PMText>{standardCount}</PMText>
            </PMHStack>
          </PMVStack>
        </PMBox>

        {recipeCount > 0 && (
          <PMBox>
            <PMHeading size="lg" mb={4}>
              Recipes ({recipeCount})
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

        {standardCount > 0 && (
          <PMBox>
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
      </PMVStack>
    </PMPage>
  );
};
