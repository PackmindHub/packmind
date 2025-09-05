import { useParams, useNavigate, NavLink } from 'react-router';
import { useEffect } from 'react';
import { PMPage } from '@packmind/ui';
import { PMVStack, PMBox, PMSpinner } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { DeploymentsPage } from '../../src/domain/deployments/components/DeploymentsPage';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/deployments`}>Overview</NavLink>
    );
  },
};

export default function DeploymentsOverviewRouteModule() {
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
      navigate(`/org/${organization.slug}/deployments`, { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage
        title="Loading..."
        subtitle="Preparing your deployment dashboard"
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
      title="Overview"
      subtitle="Monitor recipe deployments across your repositories"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <DeploymentsPage />
      </PMVStack>
    </PMPage>
  );
}
