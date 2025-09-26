import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PMHeading, PMVStack, PMBox, PMText, PMButton } from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import SignInForm from '../../src/domain/accounts/components/SignInForm';

export default function SignInRoute() {
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Sign In</PMHeading>
      </PMBox>

      <SignInForm />
      <PMBox mt={4} textAlign="center">
        <PMText>No account yet? </PMText>
        <PMButton
          variant="tertiary"
          size={'xs'}
          onClick={() => navigate('/sign-up')}
        >
          Sign up
        </PMButton>
      </PMBox>
    </PMVStack>
  );
}
