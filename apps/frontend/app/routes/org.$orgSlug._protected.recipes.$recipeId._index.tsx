import { useParams } from 'react-router';
import { PMPage, PMBox } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RecipeDetails } from '../../src/domain/recipes/components/RecipeDetails';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { RecipeId } from '@packmind/recipes';

export default function RecipeDetailsIndexRouteModule() {
  const { orgSlug, recipeId } = useParams<{
    orgSlug: string;
    recipeId: string;
  }>();
  const { isAuthenticated, organization } = useAuthContext();

  // If not authenticated, return null (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If org slug doesn't match, return null (redirect will happen in useEffect)
  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  if (!recipeId) {
    return (
      <PMPage
        title="Recipe Not Found"
        subtitle="No recipe ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <p>
            The recipe you're looking for doesn't exist or the ID is invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <RecipeDetails
      id={recipeId as RecipeId}
      orgSlug={organization.slug}
      orgName={organization.name}
    />
  );
}
