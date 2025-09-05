import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { PMPage } from '@packmind/ui';
import { PMBox, PMVStack, PMSpinner } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { GitProvidersPage } from '../../src/domain/git/components';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function OrgGitRoute() {
  const { orgSlug } = useParams();
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
      navigate(`/org/${organization.slug}/git`, { replace: true });
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage
        title="Loading..."
        subtitle="Preparing git management"
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

  return (
    <PMPage
      title="Git Management"
      subtitle="Manage your git providers and repositories"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <GitProvidersPage
          orgSlug={organization.slug}
          organizationId={organization.id}
        />
      </PMVStack>
    </PMPage>
  );
}
