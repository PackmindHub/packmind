import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMAlert,
  PMButton,
  PMField,
  PMFormContainer,
  PMHStack,
  PMInput,
  PMText,
} from '@packmind/ui';
import {
  useCheckEmailAvailabilityMutation,
  useSignInMutation,
  useSignUpWithOrganizationMutation,
} from '../api/queries';
import validator from 'validator';
import { routes } from '../../../shared/utils/routes';
import { SignUpWithOrganizationFormDataTestIds } from '@packmind/frontend';
import SocialLoginButtons from './SocialLoginButtons';
import { StartProductTour } from '../../../shared/components/StartProductTour';

export default function SignUpWithOrganizationForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const signUpWithOrganizationMutation = useSignUpWithOrganizationMutation();
  const signInMutation = useSignInMutation();
  const checkEmailAvailabilityMutation = useCheckEmailAvailabilityMutation();
  const navigate = useNavigate();

  // Show password fields only when user has started typing their email
  const shouldShowPasswordFields = email.trim().length > 0;

  // Real-time email availability validation
  useEffect(() => {
    if (!email.trim() || !validator.isEmail(email)) {
      setEmailError(undefined);
      return;
    }

    const validateEmailAvailability = async () => {
      try {
        const result = await checkEmailAvailabilityMutation.mutateAsync({
          email: email.trim(),
        });

        if (!result.available) {
          setEmailError('This email is already registered');
        } else {
          setEmailError(undefined);
        }
      } catch (error) {
        console.error('Failed to check email availability:', error);
        // Don't show error to user for availability check failures
        setEmailError(undefined);
      }
    };

    const debounceTimer = setTimeout(validateEmailAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [email]);

  const getButtonText = () => {
    if (signUpWithOrganizationMutation.isPending) return 'Creating Account...';
    if (signInMutation.isPending) return 'Signing In...';
    if (!shouldShowPasswordFields) return 'Continue with email';
    return 'Create Account';
  };

  const validateForm = () => {
    const newErrors: typeof formErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validator.isEmail(email)) {
      newErrors.email = 'Email must be a valid email address';
    }

    // Only validate password fields if they are visible
    if (shouldShowPasswordFields) {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else {
        // Count non-alphanumerical characters
        const nonAlphaNumCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;
        if (nonAlphaNumCount < 2) {
          newErrors.password =
            'Password must contain at least 2 non-alphanumerical characters';
        }
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (emailError) {
      return;
    }

    // If password fields are not visible yet, just validate to show them
    if (!shouldShowPasswordFields) {
      validateForm(); // This will trigger validation and potentially show errors
      return;
    }

    if (!validateForm()) {
      return;
    }

    signUpWithOrganizationMutation.mutate(
      {
        email: email.trim(),
        password,
        method: 'password',
      },
      {
        onSuccess: () => {
          // Auto-login the user after successful registration
          signInMutation.mutate(
            {
              email: email.trim(),
              password,
            },
            {
              onSuccess: () => {
                // Redirect to create organization page after successful registration and login
                navigate('/sign-up/create-organization');
              },
              onError: (error) => {
                console.error('Auto-login failed after registration:', error);
                // Fallback to sign-in page if auto-login fails
                navigate(routes.auth.toSignIn());
              },
            },
          );
        },
      },
    );
  };

  const emailId = 'signup-email';
  const passwordId = 'signup-password';
  const confirmPasswordId = 'signup-confirm-password';

  const EMAIL_MAX_LENGTH = 255;
  const PASSWORD_MAX_LENGTH = 128;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        data-testId={SignUpWithOrganizationFormDataTestIds.Component}
      >
        <PMFormContainer maxWidth="full" spacing={4}>
          <PMField.Root required invalid={!!formErrors.email || !!emailError}>
            <PMField.Label>
              Work email <PMField.RequiredIndicator />
            </PMField.Label>

            <PMInput
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
              placeholder="name@yourcompany.com"
              required
              disabled={
                signUpWithOrganizationMutation.isPending ||
                signInMutation.isPending
              }
              maxLength={EMAIL_MAX_LENGTH}
              data-testId={SignUpWithOrganizationFormDataTestIds.EmailField}
            />
            <PMField.ErrorText>
              {formErrors.email || emailError}
            </PMField.ErrorText>
          </PMField.Root>

          {shouldShowPasswordFields && (
            <>
              <PMField.Root required invalid={!!formErrors.password}>
                <PMField.Label>
                  Password <PMField.RequiredIndicator />
                </PMField.Label>
                <PMField.HelperText as={'article'}>
                  8 characters min. with at least 2 non-alphanumerical
                  characters.
                </PMField.HelperText>

                <PMInput
                  id={passwordId}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={
                    signUpWithOrganizationMutation.isPending ||
                    signInMutation.isPending
                  }
                  maxLength={PASSWORD_MAX_LENGTH}
                  data-testId={
                    SignUpWithOrganizationFormDataTestIds.PasswordField
                  }
                />
                <PMField.ErrorText>{formErrors.password}</PMField.ErrorText>
              </PMField.Root>

              <PMField.Root required invalid={!!formErrors.confirmPassword}>
                <PMField.Label>
                  Confirm Password
                  <PMField.RequiredIndicator />
                </PMField.Label>
                <PMInput
                  id={confirmPasswordId}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={
                    signUpWithOrganizationMutation.isPending ||
                    signInMutation.isPending
                  }
                  maxLength={PASSWORD_MAX_LENGTH}
                  data-testId={
                    SignUpWithOrganizationFormDataTestIds.ConfirmPasswordField
                  }
                />
                <PMField.ErrorText>
                  {formErrors.confirmPassword}
                </PMField.ErrorText>
              </PMField.Root>
            </>
          )}

          {signUpWithOrganizationMutation.error && (
            <PMAlert.Root status="error">
              <PMAlert.Indicator />
              <PMAlert.Title>
                {signUpWithOrganizationMutation.error.message ||
                  'Failed to create account. Please try again.'}
              </PMAlert.Title>
            </PMAlert.Root>
          )}

          <PMButton
            type="submit"
            disabled={
              signUpWithOrganizationMutation.isPending ||
              signInMutation.isPending ||
              !!emailError ||
              (shouldShowPasswordFields && (!password || !confirmPassword))
            }
            data-testId={SignUpWithOrganizationFormDataTestIds.Submit}
          >
            {getButtonText()}
          </PMButton>

          <PMHStack justifyContent="center" paddingX={6} gap={4} wrap="wrap">
            <PMText variant="small">
              Just Exploring?{' '}
              <StartProductTour
                triggerText="Take a 2-minute tour"
                variant="secondary"
                size="xs"
              />
            </PMText>
          </PMHStack>
        </PMFormContainer>
      </form>

      <SocialLoginButtons />
    </>
  );
}
