import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PMBox, PMVStack, PMHeading, PMText, PMButton } from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import ForgotPasswordForm from '../../src/domain/accounts/components/ForgotPasswordForm';

export default function ForgotPasswordRoute() {
  const { isAuthenticated } = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Show form immediately - redirect happens in background if authenticated
  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Forgot your password?</PMHeading>
        <PMText color="secondary" mt={2}>
          Enter your email address to receive a password reset link. We&apos;ll
          send instructions if your account is active.
        </PMText>
      </PMBox>

      <ForgotPasswordForm />

      <PMBox textAlign="center">
        <PMButton
          type="button"
          variant="tertiary"
          size="xs"
          onClick={() => navigate('/sign-in')}
        >
          Back to sign in
        </PMButton>
      </PMBox>
    </PMVStack>
  );
}
