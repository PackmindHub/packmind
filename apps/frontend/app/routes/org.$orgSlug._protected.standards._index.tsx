import { useParams, useNavigate, Link } from 'react-router';
import { useEffect } from 'react';
import { PMPage, PMButton } from '@packmind/ui';
import { PMVStack, PMBox, PMSpinner } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardsList } from '../../src/domain/standards/components/StandardsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function OrgStandardsIndex() {
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
      navigate(`/org/${organization.slug}/standards`, { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage
        title="Loading..."
        subtitle="Preparing your standards"
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
      title="Standards"
      subtitle="Create and manage your standards"
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <Link to={`/org/${organization.slug}/standards/create`}>
          <PMButton>Create</PMButton>
        </Link>
      }
      LinkComponent={Link}
    >
      <PMVStack align="stretch" gap={6}>
        <StandardsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
