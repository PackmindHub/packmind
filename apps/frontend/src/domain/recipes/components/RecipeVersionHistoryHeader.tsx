import { PMHStack, PMText } from '@packmind/ui';
import { Recipe, WithTimestamps } from '@packmind/types';
import { formatDistanceToNowStrict } from 'date-fns';
import { RecipeVersionsListDrawer } from './RecipeVersionsListDrawer';
import { PackageCountHeaderInfo } from '../../deployments/components/PackageCountBadge';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useParams } from 'react-router';

interface RecipeVersionHistoryHeaderProps {
  recipe: Recipe;
}

export const RecipeVersionHistoryHeader = ({
  recipe,
}: RecipeVersionHistoryHeaderProps) => {
  const updatedAt = (recipe as WithTimestamps<Recipe>).updatedAt;
  const { spaceSlug, spaceId } = useCurrentSpace();
  const { organization } = useAuthContext();
  const { orgSlug } = useParams<{ orgSlug: string }>();

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
      <PackageCountHeaderInfo
        artifactId={recipe.id}
        artifactType="recipe"
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
        spaceId={spaceId}
        organizationId={organization?.id}
      />
    </PMHStack>
  );
};
