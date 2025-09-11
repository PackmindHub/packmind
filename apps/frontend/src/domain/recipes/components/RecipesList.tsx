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
  PMAlertDialog,
  PMButtonGroup,
} from '@packmind/ui';

import {
  useGetRecipesQuery,
  useDeleteRecipesBatchMutation,
} from '../api/queries/RecipesQueries';

import { DeployRecipeButton } from './DeployRecipeButton';
import './RecipesList.styles.scss';
import { Recipe } from '@packmind/recipes/types';
import { RECIPE_MESSAGES } from '../constants/messages';

interface RecipesListProps {
  orgSlug: string;
}

export const RecipesList = ({ orgSlug }: RecipesListProps) => {
  const { data: recipes, isLoading, isError } = useGetRecipesQuery();
  const deleteBatchMutation = useDeleteRecipesBatchMutation();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedRecipes, setSelectedRecipes] = React.useState<Recipe[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteAlert, setDeleteAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSelectRecipe = (recipe: Recipe, isChecked: boolean) => {
    if (isChecked) {
      setSelectedRecipes((prev) => [...prev, recipe]);
    } else {
      setSelectedRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked && recipes) {
      setSelectedRecipes(recipes);
    } else {
      setSelectedRecipes([]);
    }
  };

  const handleBatchDelete = async () => {
    if (!isSomeSelected) return;

    try {
      const count = selectedRecipes.length;
      await deleteBatchMutation.mutateAsync(selectedRecipes.map((r) => r.id));
      setSelectedRecipes([]);
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

  React.useEffect(() => {
    if (!recipes) return;

    setTableData(
      recipes.map((recipe) => ({
        key: recipe.id,
        select: (
          <PMCheckbox
            checked={selectedRecipes.includes(recipe)}
            onChange={(event) => {
              const input = event.target as HTMLInputElement;
              handleSelectRecipe(recipe, input.checked);
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
  }, [recipes, selectedRecipes, orgSlug]);

  const isAllSelected = recipes && selectedRecipes.length === recipes.length;
  const isSomeSelected = selectedRecipes.length > 0;

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onChange={(e) => {
            handleSelectAll(!isAllSelected);
          }}
          controlProps={{ borderColor: 'border.checkbox' }}
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
          <PMButtonGroup size="sm">
            <DeployRecipeButton
              label={`Deploy (${selectedRecipes.length})`}
              disabled={!isSomeSelected}
              selectedRecipes={selectedRecipes}
              size="sm"
            />
            <PMAlertDialog
              trigger={
                <PMButton
                  variant="secondary"
                  loading={deleteBatchMutation.isPending}
                  disabled={!isSomeSelected}
                >
                  {`Delete (${selectedRecipes.length})`}
                </PMButton>
              }
              title="Delete Recipes"
              message={RECIPE_MESSAGES.confirmation.deleteBatchRecipes(
                selectedRecipes.length,
              )}
              confirmText="Delete"
              cancelText="Cancel"
              confirmColorScheme="red"
              onConfirm={handleBatchDelete}
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              isLoading={deleteBatchMutation.isPending}
            />
            <PMButton
              variant="secondary"
              onClick={() => setSelectedRecipes([])}
              disabled={!isSomeSelected}
            >
              Clear Selection
            </PMButton>
          </PMButtonGroup>
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
    </div>
  );
};
