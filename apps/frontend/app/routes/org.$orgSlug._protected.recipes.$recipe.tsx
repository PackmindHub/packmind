import { useParams, useNavigate, Link } from 'react-router';
import { useEffect } from 'react';
import { PMPage } from '@packmind/ui';
import { PMBox, PMVStack, PMSpinner } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { RecipeDetails } from '../../src/domain/recipes/components/RecipeDetails';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { RecipeId } from '@packmind/recipes';

export default function OrgRecipeDetail() {
  const { orgSlug, recipe } = useParams<{ orgSlug: string; recipe: string }>();
  const { isAuthenticated, isLoading, organization } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect unauthenticated users to get started page
    if (!isLoading && !isAuthenticated) {
      navigate('/get-started');
      return;
    }

    // If authenticated but org slug doesn't match current user's org, redirect to correct org
    if (
      !isLoading &&
      isAuthenticated &&
      organization &&
      orgSlug !== organization.slug
    ) {
      navigate(`/org/${organization.slug}/recipes/${recipe}`, {
        replace: true,
      });
      return;
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, recipe, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage
        title="Loading..."
        subtitle="Preparing recipe details"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <PMSpinner size="lg" />
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  // If not authenticated, return null (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If org slug doesn't match, return null (redirect will happen in useEffect)
  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  if (!recipe) {
    return (
      <PMPage
        title="Recipe Not Found"
        subtitle="No recipe ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
        LinkComponent={Link}
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
      id={recipe as RecipeId}
      orgSlug={organization.slug}
      orgName={organization.name}
    />
  );
}
