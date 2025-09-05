import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMHStack,
  PMLink,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMCheckbox,
  PMAlert,
  PMDialog,
  PMText,
} from '@packmind/ui';

import {
  useGetRecipesQuery,
  useDeleteRecipesBatchMutation,
} from '../api/queries/RecipesQueries';

import { DeployRecipeButton } from './DeployRecipeButton';
import { useDeployRecipe } from '../../deployments/hooks';
import './RecipesList.styles.scss';
import { RecipeId } from '@packmind/recipes/types';
import { GitRepoId } from '@packmind/git/types';
import { RECIPE_MESSAGES } from '../constants/messages';

interface RecipesListProps {
  orgSlug: string;
}

export const RecipesList = ({ orgSlug }: RecipesListProps) => {
  const { data: recipes, isLoading, isError } = useGetRecipesQuery();
  const deleteBatchMutation = useDeleteRecipesBatchMutation();
  const { deployRecipes, isDeploying } = useDeployRecipe();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedRecipeIds, setSelectedRecipeIds] = React.useState<RecipeId[]>(
    [],
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSelectRecipe = (recipeId: RecipeId, isChecked: boolean) => {
    if (isChecked) {
      setSelectedRecipeIds((prev) => [...prev, recipeId]);
    } else {
      setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipeId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked && recipes) {
      setSelectedRecipeIds(recipes.map((recipe) => recipe.id));
    } else {
      setSelectedRecipeIds([]);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecipeIds.length === 0) return;

    try {
      const count = selectedRecipeIds.length;
      await deleteBatchMutation.mutateAsync(selectedRecipeIds);
      setSelectedRecipeIds([]);
      setDeleteAlert({
        type: 'success',
        message:
          count === 1
            ? RECIPE_MESSAGES.success.deleted
            : `${count} recipes deleted successfully!`,
      });
      setDeleteDialogOpen(false);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete recipes:', error);
      setDeleteAlert({
        type: 'error',
        message: RECIPE_MESSAGES.error.deleteFailed,
      });
      setDeleteDialogOpen(false);
    }
  };

  const handleBatchDeploy = async (repositoryIds: GitRepoId[]) => {
    if (selectedRecipeIds.length === 0) return;

    const selectedRecipes =
      recipes
        ?.filter((recipe) => selectedRecipeIds.includes(recipe.id))
        .map((recipe) => ({
          id: recipe.id,
          version: recipe.version,
          name: recipe.name,
        })) || [];

    await deployRecipes({ recipes: selectedRecipes }, repositoryIds);
  };

  React.useEffect(() => {
    if (!recipes) return;

    setTableData(
      recipes.map((recipe) => ({
        key: recipe.id,
        select: (
          <PMCheckbox
            checked={selectedRecipeIds.includes(recipe.id)}
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              handleSelectRecipe(recipe.id, input.checked);
            }}
          />
        ),
        name: (
          <PMLink asChild>
            <Link to={`/org/${orgSlug}/recipes/${recipe.id}`}>
              {recipe.name}
            </Link>
          </PMLink>
        ),
        slug: recipe.slug,
        version: recipe.version,
      })),
    );
  }, [recipes, selectedRecipeIds, orgSlug]);

  const isAllSelected = recipes && selectedRecipeIds.length === recipes.length;
  const isSomeSelected = selectedRecipeIds.length > 0;

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onChange={(e) => {
            handleSelectAll(!isAllSelected);
          }}
        />
      ),
      width: '50px',
      align: 'center',
    },
    { key: 'name', header: 'Name', grow: true },
    { key: 'slug', header: 'Slug', grow: true },
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
  ];

  return (
    <div className={'recipes-list'}>
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading recipes.</p>}
      {recipes?.length ? (
        <PMBox>
          {isSomeSelected && (
            <PMBox mb={4}>
              <PMHStack gap={2}>
                <DeployRecipeButton
                  label={`Deploy Selected (${selectedRecipeIds.length})`}
                  onDeploy={handleBatchDeploy}
                  loading={isDeploying}
                  disabled={selectedRecipeIds.length === 0}
                />
                <PMButton
                  variant="outline"
                  colorScheme="red"
                  onClick={() => setDeleteDialogOpen(true)}
                  loading={deleteBatchMutation.isPending}
                >
                  {`Delete Selected (${selectedRecipeIds.length})`}
                </PMButton>
                <PMButton
                  variant="secondary"
                  onClick={() => setSelectedRecipeIds([])}
                >
                  Clear Selection
                </PMButton>
              </PMHStack>
            </PMBox>
          )}
          <PMTable
            columns={columns}
            data={tableData}
            striped={true}
            hoverable={true}
            size="md"
            variant="line"
          />
        </PMBox>
      ) : (
        <p>No recipes found</p>
      )}

      {/* Delete Confirmation Dialog */}
      <PMDialog.Root
        open={deleteDialogOpen}
        onOpenChange={({ open }) => setDeleteDialogOpen(open)}
      >
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Delete Recipes</PMDialog.Title>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText>
                {RECIPE_MESSAGES.confirmation.deleteBatchRecipes(
                  selectedRecipeIds.length,
                )}
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
                onClick={handleBatchDelete}
                loading={deleteBatchMutation.isPending}
              >
                Delete
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
    </div>
  );
};
