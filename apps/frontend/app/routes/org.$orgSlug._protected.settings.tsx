import { useParams, useNavigate, NavLink } from 'react-router';
import { useEffect } from 'react';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { SettingsPage } from '../../src/domain/accounts/components/SettingsPage';
import { PMBox, PMVStack, PMSpinner } from '@packmind/ui';
import { PMPage } from '@packmind/ui';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; standardId: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/Settings`}>Settings</NavLink>;
  },
};

export default function SettingsRoute() {
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
      navigate(`/org/${organization.slug}`, { replace: true });
      return;
    }
  }, [isAuthenticated, isLoading, organization, orgSlug, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PMPage title="Settings">
        <PMBox
          height="400px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <PMVStack>
            <PMSpinner size="lg" color="blue.500" />
          </PMVStack>
        </PMBox>
      </PMPage>
    );
  }

  // Don't render anything while redirecting
  if (!isAuthenticated || !organization || orgSlug !== organization.slug) {
    return null;
  }

  return <SettingsPage />;
}
