import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PMBox, PMHStack, PMSeparator, PMVStack } from '@packmind/ui';
import { PMPage, PMText, PMHeading } from '@packmind/ui';
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

  if (isLoading) return <div>Loading...</div>;
  if (isAuthenticated) return null;

  return (
    <PMPage
      title="Get Started"
      subtitle="Create your organization or join an existing one"
    >
      <PMBox maxWidth="600px" mx="auto" p={6}>
        <PMVStack gap={8} align="stretch">
          {/* Go to Existing Organization Section */}
          <PMBox>
            <PMBox mb={3}>
              <PMHeading level="h2">Join Existing Organization</PMHeading>
            </PMBox>
            <PMBox mb={4}>
              <PMText variant="body">
                Already have an organization? Enter its name to sign in.
              </PMText>
            </PMBox>
            <GoToOrganization />
          </PMBox>

          {/* Divider */}
          <PMHStack>
            <PMSeparator flex="1" />
            <PMText flexShrink="0">Or</PMText>
            <PMSeparator flex="1" />
          </PMHStack>

          {/* Create New Organization Section */}
          <PMBox>
            <PMBox mb={3}>
              <PMHeading level="h2">Create New Organization</PMHeading>
            </PMBox>
            <PMBox mb={4}>
              <PMText variant="body">
                Start fresh by creating a new organization for your team.
              </PMText>
            </PMBox>
            <CreateOrganization />
          </PMBox>
        </PMVStack>
      </PMBox>
    </PMPage>
  );
}
