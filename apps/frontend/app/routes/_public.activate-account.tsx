import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMSpinner,
  PMAlert,
  PMButton,
} from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import ActivateTrialAccountForm from '../../src/domain/accounts/components/ActivateTrialAccountForm';

export default function ActivateAccountRoute() {
  const { isAuthenticated, isLoading: authLoading } = useIsAuthenticated();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/');
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <PMVStack gap={6} align="center">
        <PMSpinner size="lg" />
        <PMText>Loading...</PMText>
      </PMVStack>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  if (!token) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">Invalid Activation Link</PMHeading>
          <PMText color="secondary" mt={2}>
            No activation token was provided in the URL.
          </PMText>
        </PMBox>

        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Missing activation token</PMAlert.Title>
            <PMAlert.Description>
              Please use the activation link provided by your AI assistant or
              request a new one.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>

        <PMBox textAlign="center">
          <PMButton variant="secondary" onClick={() => navigate('/sign-in')}>
            Go to Sign In
          </PMButton>
        </PMBox>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Activate Your Trial Account</PMHeading>
        <PMText color="secondary" mt={2}>
          Set up your organization, email, and password to complete your account
          activation.
        </PMText>
      </PMBox>

      <ActivateTrialAccountForm token={token} />

      <PMText color="secondary" fontSize="sm" textAlign="center">
        Activation links expire after 5 minutes. If this one stops working,
        request a new link from your AI assistant.
      </PMText>
    </PMVStack>
  );
}
