import { PMHStack, PMText } from '@packmind/ui';
import { Recipe, WithTimestamps } from '@packmind/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { RecipeVersionsListDrawer } from './RecipeVersionsListDrawer';

interface RecipeVersionHistoryHeaderProps {
  recipe: Recipe;
}

export const RecipeVersionHistoryHeader = ({
  recipe,
}: RecipeVersionHistoryHeaderProps) => {
  const updatedAt = (recipe as WithTimestamps<Recipe>).updatedAt;

  return (
    <PMHStack gap={8} alignItems="center" height="full">
      <PMHStack gap={2} alignItems="center" height="full">
        {updatedAt && (
          <PMText variant="small" color="secondary">
            Last updated: {formatDistanceToNowStrict(new Date(updatedAt))} ago
          </PMText>
        )}
      </PMHStack>
      <PMHStack gap={1} alignItems="center" height="full">
        <PMText variant="small" color="secondary">
          Version:
        </PMText>
        <PMText variant="small">{recipe.version}</PMText>
        <RecipeVersionsListDrawer recipeId={recipe.id} />
      </PMHStack>
    </PMHStack>
  );
};
