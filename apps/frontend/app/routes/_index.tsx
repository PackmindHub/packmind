import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { useAuthErrorHandler } from '../../src/domain/accounts/hooks/useAuthErrorHandler';
import { PMPage, PMBox, PMVStack, PMSpinner } from '@packmind/ui';

export default function IndexRoute() {
  const { isAuthenticated, isLoading, organization } = useAuthContext();
  const navigate = useNavigate();
  useAuthErrorHandler();

  useEffect(() => {
    // Redirect unauthenticated users to sign in page
    if (!isLoading && !isAuthenticated) {
      navigate('/sign-in');
      return;
    }

    // Redirect authenticated users with selected organization to their org page
    if (!isLoading && isAuthenticated && organization) {
      navigate(`/org/${organization.slug}`, { replace: true });
      return;
    }

    // Redirect authenticated users without selected organization back to sign-in
    // The sign-in page will handle organization selection/creation
    if (!isLoading && isAuthenticated && !organization) {
      navigate('/sign-in', { replace: true });
    }
  }, [isAuthenticated, isLoading, organization, navigate]);

  // Show loading state while checking authentication and preparing redirect
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
