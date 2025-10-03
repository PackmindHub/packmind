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
import ResetPasswordForm from '../../src/domain/accounts/components/ResetPasswordForm';
import { useValidatePasswordResetTokenQuery } from '../../src/domain/accounts/api/queries/AuthQueries';

export default function ResetPasswordRoute() {
  const { isAuthenticated, isLoading: authLoading } = useIsAuthenticated();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const {
    data: validationData,
    isLoading: isValidating,
    isError: validationError,
  } = useValidatePasswordResetTokenQuery(token);

  const tokenState = (() => {
    if (!token) return 'invalid';
    if (isValidating) return 'loading';
    if (validationError) return 'invalid';
    if (validationData?.isValid) return 'valid';
    return 'invalid';
  })();

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

  if (tokenState === 'loading') {
    return (
      <PMVStack gap={6} align="center">
        <PMSpinner size="lg" />
        <PMText>Validating reset link...</PMText>
      </PMVStack>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">Reset Link Unavailable</PMHeading>
          <PMText color="secondary" mt={2}>
            This password reset link is invalid or has expired. For security, we
            can&apos;t validate this request. Please request a new reset email.
          </PMText>
        </PMBox>

        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Unable to use this link</PMAlert.Title>
            <PMAlert.Description>
              The link may have expired or been used already. To keep your
              account secure, please request another password reset email.
            </PMAlert.Description>
          </PMAlert.Content>
        </PMAlert.Root>

        <PMBox textAlign="center">
          <PMButton
            variant="secondary"
            onClick={() => navigate('/forgot-password')}
          >
            Request new reset link
          </PMButton>
        </PMBox>
      </PMVStack>
    );
  }

  const email = validationData?.email ?? '';

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Reset your password</PMHeading>
        <PMText color="secondary" mt={2}>
          Choose a new password for your Packmind account. Once saved,
          you&apos;ll be signed in automatically.
        </PMText>
      </PMBox>

      <ResetPasswordForm token={token} email={email} />

      <PMText color="secondary" fontSize="sm" textAlign="center">
        Password reset links expire after 4 hours. If this one stops working,
        request a new link from the Forgot Password page.
      </PMText>
    </PMVStack>
  );
}
