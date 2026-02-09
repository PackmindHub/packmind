import React from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMLink,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMCheckbox,
  PMAlert,
  PMAlertDialog,
  PMButtonGroup,
} from '@packmind/ui';

import {
  useGetRecipesQuery,
  useDeleteRecipesBatchMutation,
} from '../api/queries/RecipesQueries';

import './RecipesList.styles.scss';
import { Recipe, RecipeId } from '@packmind/types';
import { RECIPE_MESSAGES } from '../constants/messages';
import { formatDistanceToNowStrict } from 'date-fns';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { routes } from '../../../shared/utils/routes';
import { WithTimestamps } from '@packmind/types';
import { RecipesBlankState } from './RecipesBlankState';

interface RecipesListProps {
  orgSlug: string;
  onEmptyStateChange?: (isEmpty: boolean) => void;
}

export const RecipesList = ({
  orgSlug,
  onEmptyStateChange,
}: RecipesListProps) => {
  const { organization } = useAuthContext();
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { data: recipes, isLoading, isError } = useGetRecipesQuery();
  const deleteBatchMutation = useDeleteRecipesBatchMutation();
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
      setSelectedRecipeIds((prev) =>
        prev.includes(recipeId) ? prev : [...prev, recipeId],
      );
    } else {
      setSelectedRecipeIds((prev) => prev.filter((id) => id !== recipeId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked && recipes) {
      setSelectedRecipeIds(recipes.map((r) => r.id));
    } else {
      setSelectedRecipeIds([]);
    }
  };

  const handleBatchDelete = async () => {
    if (!isSomeSelected || !organization?.id || !spaceId) return;

    try {
      const count = selectedRecipeIds.length;
      await deleteBatchMutation.mutateAsync({
        organizationId: organization.id,
        spaceId,
        recipeIds: selectedRecipeIds,
      });
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

  React.useEffect(() => {
    if (!recipes) return;

    const sortedRecipes = [...recipes].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    setTableData(
      sortedRecipes.map((recipe) => ({
        key: recipe.id,
        select: (
          <PMCheckbox
            checked={selectedRecipeIds.includes(recipe.id)}
            onCheckedChange={(e) => {
              handleSelectRecipe(recipe.id, e.checked === true);
            }}
          />
        ),
        name: (
          <PMLink asChild>
            <Link
              to={
                spaceSlug
                  ? routes.space.toCommand(orgSlug, spaceSlug, recipe.id)
                  : '#'
              }
            >
              {recipe.name}
            </Link>
          </PMLink>
        ),
        updatedAt: (
          <>
            {formatDistanceToNowStrict(
              (recipe as WithTimestamps<Recipe>).updatedAt || new Date(),
              {
                addSuffix: true,
              },
            )}
          </>
        ),
        version: recipe.version,
      })),
    );
  }, [recipes, selectedRecipeIds, orgSlug, spaceSlug]);

  const isAllSelected = recipes && selectedRecipeIds.length === recipes.length;
  const isSomeSelected = selectedRecipeIds.length > 0;
  const hasRecipes = (recipes ?? []).length > 0;

  React.useEffect(() => {
    if (onEmptyStateChange) {
      onEmptyStateChange(!hasRecipes);
    }
  }, [hasRecipes, onEmptyStateChange]);

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected || false}
          onCheckedChange={() => {
            handleSelectAll(!isAllSelected);
          }}
          controlProps={{ borderColor: 'border.checkbox' }}
        />
      ),
      width: '50px',
      align: 'center',
    },
    { key: 'name', header: 'Name', grow: true },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      width: '250px',
      align: 'center',
    },
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
      {hasRecipes ? (
        <PMBox>
          <PMButtonGroup size="sm" mb={4}>
            <PMAlertDialog
              trigger={
                <PMButton
                  variant="secondary"
                  loading={deleteBatchMutation.isPending}
                  disabled={!isSomeSelected}
                >
                  {`Delete (${selectedRecipeIds.length})`}
                </PMButton>
              }
              title="Delete Recipes"
              message={RECIPE_MESSAGES.confirmation.deleteBatchRecipes(
                selectedRecipeIds.length,
              )}
              confirmText="Delete"
              cancelText="Cancel"
              confirmColorScheme="red"
              onConfirm={handleBatchDelete}
              open={deleteDialogOpen}
              onOpenChange={({ open }) => setDeleteDialogOpen(open)}
              isLoading={deleteBatchMutation.isPending}
            />
            <PMButton
              variant="secondary"
              onClick={() => setSelectedRecipeIds([])}
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
        spaceSlug && (
          <RecipesBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />
        )
      )}
    </div>
  );
};
