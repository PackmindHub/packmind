import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { PMPage } from '@packmind/ui';
import { PMBox, PMVStack, PMSpinner } from '@packmind/ui';

export default function IndexRoute() {
  const { isAuthenticated, isLoading, organization } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect unauthenticated users to sign in page
    if (!isLoading && !isAuthenticated) {
      navigate('/sign-in');
      return;
    }

    // Redirect authenticated users to their organization's home page
    if (!isLoading && isAuthenticated && organization) {
      navigate(`/org/${organization.slug}`, { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, organization, navigate]);

  // Show loading state while checking authentication and preparing redirect
  if (isLoading) {
    return (
      <PMPage title="Welcome to Packmind" subtitle="Loading your dashboard...">
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <PMSpinner size="lg" />
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  // Show loading state while waiting for organization data
  if (isAuthenticated && !organization) {
    return (
      <PMPage
        title="Welcome to Packmind"
        subtitle="Preparing your organization..."
      >
        <PMBox display="flex" justifyContent="center" py={8}>
          <PMVStack gap={4}>
            <PMSpinner size="lg" />
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  // Return null - redirects will happen in useEffect
  return null;
}
