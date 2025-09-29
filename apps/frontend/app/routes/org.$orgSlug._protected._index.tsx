import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { OrganizationHomePage } from '../../src/domain/accounts/components/OrganizationHomePage';
import { PMPage } from '@packmind/ui';
import { PMBox, PMVStack, PMSpinner } from '@packmind/ui';

export default function OrganizationHomeRoute() {
  const { orgSlug } = useParams();
  const { isAuthenticated, isLoading, organization } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect unauthenticated users to sign in page
    if (!isLoading && !isAuthenticated) {
      navigate('/sign-in');
      return;
    }

    // If authenticated but org slug doesn't match current user's org, redirect to correct org
    if (
      !isLoading &&
      isAuthenticated &&
      organization &&
      orgSlug !== organization.slug
    ) {
      navigate(`/org/${organization.slug}`, { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage
        title="Loading..."
        subtitle="Preparing your organization dashboard"
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

  // Show organization home page for authenticated users in correct org
  return <OrganizationHomePage />;
}
