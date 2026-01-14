import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMHStack,
} from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import SignUpWithOrganizationForm from '../../src/domain/accounts/components/SignUpWithOrganizationForm';

export default function CreateAccountRouteModule() {
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
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Create your account</PMHeading>
        <PMText color="secondary" mt={2}>
          Start your journey with Packmind by creating your organization and
          account
        </PMText>
      </PMBox>

      <SignUpWithOrganizationForm />

      <PMHStack justifyContent="center" paddingX={6}>
        <PMText>Already have an account?</PMText>
        <PMButton
          variant="tertiary"
          size="xs"
          onClick={() => navigate('/sign-in')}
        >
          Sign in
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}
