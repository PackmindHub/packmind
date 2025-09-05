import { useParams, useNavigate, Link, NavLink } from 'react-router';
import { useEffect } from 'react';
import { PMPage } from '@packmind/ui';
import { PMBox, PMVStack, PMSpinner } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { AddRepositoryPage } from '../../src/domain/git/components';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { GitProviderId } from '@packmind/git';

export default function AddRepositoryRoute() {
  const { orgSlug, providerId } = useParams();
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
      navigate(
        `/org/${organization.slug}/git/providers/${providerId}/repositories/add`,
        { replace: true },
      );
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, providerId, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage
        title="Loading..."
        subtitle="Preparing repository selection"
        breadcrumbComponent={<AutobreadCrumb />}
        LinkComponent={NavLink}
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

  if (!providerId) {
    navigate(`/org/${organization.slug}/git`);
    return null;
  }

  return (
    <PMPage
      title="Add Repository"
      subtitle="Select a repository to add to your git provider"
      breadcrumbComponent={<AutobreadCrumb />}
      LinkComponent={Link}
    >
      <PMVStack align="stretch" gap={6}>
        <AddRepositoryPage
          orgSlug={organization.slug}
          providerId={providerId as GitProviderId}
        />
      </PMVStack>
    </PMPage>
  );
}
