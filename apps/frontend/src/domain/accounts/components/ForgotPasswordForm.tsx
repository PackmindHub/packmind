import React, { useState } from 'react';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMAlert,
  PMText,
} from '@packmind/ui';
import { useRequestPasswordResetMutation } from '../api/queries/AuthQueries';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

const MIN_EMAIL_LENGTH = 3;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; form?: string }>({});
  const [confirmation, setConfirmation] = useState('');

  const requestPasswordResetMutation = useRequestPasswordResetMutation();

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (trimmedEmail.length < MIN_EMAIL_LENGTH) {
      newErrors.email = 'Email must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setErrors({});
    setConfirmation('');

    try {
      const trimmedEmail = email.trim();
      await requestPasswordResetMutation.mutateAsync({
        email: trimmedEmail,
      });

      setConfirmation(trimmedEmail);
    } catch (error) {
      let errorMessage =
        'Unable to process your request right now. Please try again later.';

      if (isPackmindError(error)) {
        errorMessage = error.serverError.data.message;
      }

      setErrors({ form: errorMessage });
    }
  };

  const hasConfirmation = Boolean(confirmation);
  const isSubmitting = requestPasswordResetMutation.isPending;
  const emailFieldId = 'forgot-password-email';

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer spacing={4} maxWidth="full">
        {hasConfirmation && (
          <PMAlert.Root status="success">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>Password reset requested</PMAlert.Title>
              <PMAlert.Description>
                If an active account exists for <strong>{confirmation}</strong>,
                you&apos;ll receive an email with instructions to reset your
                password. The link will expire in 4 hours.
              </PMAlert.Description>
            </PMAlert.Content>
          </PMAlert.Root>
        )}

        {errors.form && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>{errors.form}</PMAlert.Title>
          </PMAlert.Root>
        )}

        <PMField.Root required invalid={!!errors.email}>
          <PMField.Label>
            Email
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMField.HelperText>
            Enter the email associated with your Packmind account.
          </PMField.HelperText>

          <PMInput
            id={emailFieldId}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
            disabled={isSubmitting}
            error={errors.email}
            autoComplete="email"
          />

          <PMField.ErrorText>{errors.email}</PMField.ErrorText>
        </PMField.Root>

        <PMButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
        </PMButton>

        {hasConfirmation && (
          <PMText color="secondary" textAlign="center">
            Didn&apos;t receive an email? Check your spam folder or try again
            after a few minutes.
          </PMText>
        )}
      </PMFormContainer>
    </form>
  );
}
