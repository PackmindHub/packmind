import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PMText, PMHeading, PMBox, PMVStack, PMButton } from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import CreateOrganization from '../../src/domain/accounts/components/CreateOrganization';
import GoToOrganization from '../../src/domain/accounts/components/GoToOrganization';

export default function GetStartedRoute() {
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const [showCreateOrg, setShowCreateOrg] = useState(false);

  if (isLoading) return <div>Loading...</div>;
  if (isAuthenticated) return null;

  return (
    <PMVStack gap={8} align="stretch">
      {!showCreateOrg ? (
        <>
          {/* Go to Existing Organization Section */}
          <PMBox>
            <PMBox mb={3} textAlign={'center'}>
              <PMHeading level="h2">Sign in to your organization</PMHeading>
            </PMBox>
            <GoToOrganization />
            <PMBox mt={4} textAlign="center">
              <PMText>No organization yet? </PMText>
              <PMButton
                variant="tertiary"
                size={'xs'}
                onClick={() => setShowCreateOrg(true)}
              >
                Create an organization
              </PMButton>
            </PMBox>
          </PMBox>
        </>
      ) : (
        <>
          {/* Create New Organization Section */}
          <PMBox>
            <PMBox mb={3} textAlign={'center'}>
              <PMHeading level="h2">Create a new organization</PMHeading>
            </PMBox>
            <CreateOrganization />
            <PMBox mt={4} textAlign="center">
              <PMText>
                Already have an organization?{' '}
                <PMButton
                  variant="tertiary"
                  size={'xs'}
                  onClick={() => setShowCreateOrg(false)}
                >
                  Sign in
                </PMButton>
              </PMText>
            </PMBox>
          </PMBox>
        </>
      )}
    </PMVStack>
  );
}
