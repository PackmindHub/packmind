import React, { useState } from 'react';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMText,
  PMAlert,
} from '@packmind/ui';
import { ActivationFormDataTestIds } from '@packmind/frontend';

interface ActivationFormProps {
  email: string; // Pre-filled from invitation, read-only
  onSubmit: (password: string) => void;
  isSubmitting: boolean;
  error?: string;
}

export default function ActivationForm({
  email,
  onSubmit,
  isSubmitting,
  error,
}: ActivationFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(password);
  };

  // Real-time validation on password change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // Clear password error if it exists and re-validate
    if (errors.password) {
      const newErrors = { ...errors };
      delete newErrors.password;

      if (newPassword.length >= 8) {
        const nonAlphaNumCount = (newPassword.match(/[^a-zA-Z0-9]/g) || [])
          .length;
        if (nonAlphaNumCount >= 2) {
          // Password is now valid, clear the error
          setErrors(newErrors);
        }
      }
    }

    // Re-validate confirm password if it exists
    if (confirmPassword && errors.confirmPassword) {
      const newErrors = { ...errors };
      if (newPassword === confirmPassword) {
        delete newErrors.confirmPassword;
        setErrors(newErrors);
      }
    }
  };

  // Real-time validation on confirm password change
  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    // Clear confirm password error if passwords now match
    if (errors.confirmPassword && password === newConfirmPassword) {
      const newErrors = { ...errors };
      delete newErrors.confirmPassword;
      setErrors(newErrors);
    }
  };

  const emailId = 'activation-email';
  const passwordId = 'activation-password';
  const confirmPasswordId = 'activation-confirm-password';

  const PASSWORD_MAX_LENGTH = 128;

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="full" spacing={4}>
        {/* Email field - read-only */}
        <PMField.Root>
          <PMField.Label>Email</PMField.Label>
          <PMInput
            id={emailId}
            type="email"
            value={email}
            readOnly
            disabled
            placeholder="Your email address"
            style={{
              backgroundColor: 'var(--chakra-colors-background-muted)',
              color: 'var(--chakra-colors-text-secondary)',
            }}
          />
          <PMField.HelperText>
            This is the email address associated with your invitation.
          </PMField.HelperText>
        </PMField.Root>

        {/* Password field */}
        <PMField.Root required invalid={!!errors.password}>
          <PMField.Label>
            Password{' '}
            <PMText as="span" variant="small" color="secondary">
              ({password.length} / {PASSWORD_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMField.HelperText as="article">
            8 characters min. with at least 2 non-alphanumerical characters.
          </PMField.HelperText>

          <PMInput
            id={passwordId}
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter your password"
            required
            disabled={isSubmitting}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            data-testid={ActivationFormDataTestIds.PasswordInput}
          />
          <PMField.ErrorText>{errors.password}</PMField.ErrorText>
        </PMField.Root>

        {/* Confirm Password field */}
        <PMField.Root required invalid={!!errors.confirmPassword}>
          <PMField.Label>
            Confirm Password
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMInput
            id={confirmPasswordId}
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Confirm your password"
            required
            disabled={isSubmitting}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            data-testid={ActivationFormDataTestIds.ConfirmPasswordInput}
          />
          <PMField.ErrorText>{errors.confirmPassword}</PMField.ErrorText>
        </PMField.Root>

        {/* Server error display */}
        {error && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>
              {error || 'Failed to activate account. Please try again.'}
            </PMAlert.Title>
          </PMAlert.Root>
        )}

        {/* Submit button */}
        <PMButton
          type="submit"
          disabled={isSubmitting}
          variant="primary"
          width="full"
          data-testid={ActivationFormDataTestIds.SubmitCTA}
        >
          {isSubmitting ? 'Activating Account...' : 'Activate Account'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
