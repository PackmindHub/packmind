import React, { useState } from 'react';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMAlert,
  PMText,
} from '@packmind/ui';
import { useResetPasswordMutation } from '../api/queries/AuthQueries';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

const PASSWORD_MAX_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;
const MIN_SPECIAL_CHARACTERS = 2;

type ResetPasswordFormProps = {
  token: string;
  email: string;
  onSuccess?: () => void;
};

type ResetPasswordErrors = {
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const countSpecialCharacters = (value: string) => {
  return (value.match(/[^a-zA-Z0-9]/g) || []).length;
};

export default function ResetPasswordForm({
  token,
  email,
  onSuccess,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  const resetPasswordMutation = useResetPasswordMutation();

  const validateForm = () => {
    const newErrors: ResetPasswordErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (countSpecialCharacters(password) < MIN_SPECIAL_CHARACTERS) {
      newErrors.password =
        'Password must contain at least 2 non-alphanumerical characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      const response = await resetPasswordMutation.mutateAsync({
        token,
        password,
      });

      if (response.success) {
        setSuccessMessage('Your password has been updated successfully.');
        onSuccess?.();
      } else {
        setErrors({
          form: 'Unable to reset your password. Please try again later.',
        });
      }
    } catch (error) {
      let message = 'Unable to reset your password. Please try again later.';

      if (isPackmindError(error)) {
        message = error.serverError.data.message;
      }

      setErrors({ form: message });
    }
  };

  const isSubmitting = resetPasswordMutation.isPending;
  const isSuccess = Boolean(successMessage);
  const passwordId = 'reset-password-input';
  const confirmPasswordId = 'reset-confirm-password-input';

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPassword = event.target.value;
    setPassword(nextPassword);

    setErrors((prev) => {
      if (!prev.password && !prev.confirmPassword && !prev.form) {
        return prev;
      }

      const updated = { ...prev };
      let changed = false;

      if (updated.password) {
        delete updated.password;
        changed = true;
      }

      if (updated.confirmPassword && confirmPassword === nextPassword) {
        delete updated.confirmPassword;
        changed = true;
      }

      if (updated.form) {
        delete updated.form;
        changed = true;
      }

      return changed ? updated : prev;
    });
  };

  const handleConfirmPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextConfirmPassword = event.target.value;
    setConfirmPassword(nextConfirmPassword);

    setErrors((prev) => {
      if (!prev.confirmPassword && !prev.form) {
        return prev;
      }

      const updated = { ...prev };
      let changed = false;

      if (updated.confirmPassword && password === nextConfirmPassword) {
        delete updated.confirmPassword;
        changed = true;
      }

      if (updated.form) {
        delete updated.form;
        changed = true;
      }

      return changed ? updated : prev;
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="full" spacing={4}>
        <PMField.Root>
          <PMField.Label>Email</PMField.Label>
          <PMInput
            value={email}
            readOnly
            disabled
            type="email"
            autoComplete="email"
            style={{
              backgroundColor: 'var(--chakra-colors-background-muted)',
              color: 'var(--chakra-colors-text-secondary)',
            }}
          />
          <PMField.HelperText>
            Password reset for the account associated with this email.
          </PMField.HelperText>
        </PMField.Root>

        <PMField.Root required invalid={!!errors.password}>
          <PMField.Label>
            New password{' '}
            <PMText as="span" variant="small" color="secondary">
              ({password.length} / {PASSWORD_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMField.HelperText>
            At least 8 characters with 2 or more non-alphanumerical characters.
          </PMField.HelperText>
          <PMInput
            id={passwordId}
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter your new password"
            required
            disabled={isSubmitting || isSuccess}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
          />
          <PMField.ErrorText>{errors.password}</PMField.ErrorText>
        </PMField.Root>

        <PMField.Root required invalid={!!errors.confirmPassword}>
          <PMField.Label>
            Confirm password
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMInput
            id={confirmPasswordId}
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            placeholder="Confirm your new password"
            required
            disabled={isSubmitting || isSuccess}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
          />
          <PMField.ErrorText>{errors.confirmPassword}</PMField.ErrorText>
        </PMField.Root>

        {errors.form && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>{errors.form}</PMAlert.Title>
          </PMAlert.Root>
        )}

        {successMessage && (
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Password reset successful</PMAlert.Title>
              <PMAlert.Description>{successMessage}</PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
        )}

        <PMButton type="submit" disabled={isSubmitting || isSuccess}>
          {isSubmitting ? 'Saving password...' : 'Save new password'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
