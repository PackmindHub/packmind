import { useEffect, useState } from 'react';
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
import ActivationForm from '../../src/domain/accounts/components/ActivationForm';
import {
  useValidateInvitationQuery,
  useActivateUserAccountMutation,
} from '../../src/domain/accounts/api/queries/AuthQueries';

export default function ActivateRoute() {
  const { isAuthenticated } = useIsAuthenticated();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activationError, setActivationError] = useState<string>('');

  // Extract token from URL parameters
  const token = searchParams.get('token');

  // Use the new query hooks
  const {
    data: validationData,
    isLoading: isValidating,
    error: validationError,
  } = useValidateInvitationQuery(token || '');

  const activateUserMutation = useActivateUserAccountMutation();

  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Determine validation state based on query results
  const getValidationState = () => {
    if (!token) return 'invalid';
    if (isValidating) return 'loading';
    if (validationError) return 'invalid';
    if (validationData) {
      const { isValid } = validationData;
      if (!isValid) return 'invalid';
      return 'valid';
    }
    return 'invalid';
  };

  const tokenValidationState = getValidationState();
  const invitationEmail = validationData?.email || '';

  // Show loading while validating token
  if (tokenValidationState === 'loading') {
    return (
      <PMVStack gap={6} align="center">
        <PMSpinner size="lg" />
        <PMText>Validating invitation...</PMText>
      </PMVStack>
    );
  }

  // Handle different error states
  if (tokenValidationState === 'invalid') {
    return (
      <PMVStack gap={6} align="stretch">
        <PMBox textAlign="center">
          <PMHeading level="h2">Invalid Invitation</PMHeading>
        </PMBox>

        <PMAlert.Root status="error" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>This invitation link is not valid.</PMAlert.Title>
            <PMAlert.Description>
              The invitation link may be malformed or corrupted. Please check
              the link and try again, or contact your administrator for a new
              invitation.
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

  // Handle form submission
  const handleActivationSubmit = async (password: string) => {
    if (!token) return;

    setActivationError('');

    try {
      const result = await activateUserMutation.mutateAsync({
        token,
        password,
      });

      if (result.success) {
        // Successful activation - redirect to dashboard
        navigate('/');
      } else {
        setActivationError('Failed to activate account. Please try again.');
      }
    } catch (error) {
      setActivationError(
        error instanceof Error
          ? error.message
          : 'Failed to activate account. Please try again.',
      );
    }
  };

  // Valid token - show activation form
  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Activate Your Account</PMHeading>
        <PMText color="secondary" mt={2}>
          Set your password to complete your account activation
        </PMText>
      </PMBox>

      <ActivationForm
        email={invitationEmail}
        onSubmit={handleActivationSubmit}
        isSubmitting={activateUserMutation.isPending}
        error={activationError}
      />
    </PMVStack>
  );
}
