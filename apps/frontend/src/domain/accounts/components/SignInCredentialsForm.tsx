import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMLink,
  PMHStack,
  PMSeparator,
  PMText,
} from '@packmind/ui';
import { useSignInMutation } from '../api/queries/AuthQueries';
import { SignInUserResponse } from '@packmind/types';
import { isPackmindError } from '../../../services/api/errors/PackmindError';
import SocialLoginButtons from './SocialLoginButtons';

interface SignInCredentialsFormProps {
  onSignInSuccess: (data: SignInUserResponse) => void;
}

export default function SignInCredentialsForm({
  onSignInSuccess,
}: SignInCredentialsFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const signInMutation = useSignInMutation();

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (email.trim().length < 3) {
      newErrors.email = 'Email must be at least 3 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prevent double submission
    if (signInMutation.isPending) {
      return;
    }

    signInMutation.mutate(
      {
        email: email.trim(),
        password,
      },
      {
        onSuccess: (data) => {
          onSignInSuccess(data);
        },
        onError: (error) => {
          // Use the actual error message from the server when available
          let errorMessage = 'Invalid email or password';

          if (isPackmindError(error)) {
            errorMessage = error.serverError.data.message;
          }

          setErrors({ form: errorMessage });
        },
      },
    );
  };

  const emailId = 'signin-email';
  const passwordId = 'signin-password';

  // Get email validation status
  const getEmailError = () => {
    if (errors.email) return errors.email;
    return undefined;
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <PMFormContainer spacing={4} maxWidth="full">
          <PMField.Root required invalid={!!getEmailError()}>
            <PMField.Label>
              Email
              <PMField.RequiredIndicator />
            </PMField.Label>

            <PMInput
              id={emailId}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={signInMutation.isPending}
              error={getEmailError()}
            />

            <PMField.ErrorText>{getEmailError()}</PMField.ErrorText>
          </PMField.Root>

          <PMField.Root required>
            <PMField.Label>
              Password
              <PMField.RequiredIndicator />
            </PMField.Label>
            <PMInput
              id={passwordId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={signInMutation.isPending}
              error={errors.password}
            />
          </PMField.Root>

          {errors.form && (
            <div style={{ color: 'red', marginTop: 8 }}>{errors.form}</div>
          )}

          <PMButton type="submit" disabled={signInMutation.isPending}>
            {signInMutation.isPending ? 'Signing In...' : 'Sign In'}
          </PMButton>

          <PMLink asChild variant="underline" fontSize="xs" color="secondary">
            <Link to="/forgot-password">Forgot password?</Link>
          </PMLink>
        </PMFormContainer>
      </form>

      {/* Separator + social buttons at the bottom */}
      <PMHStack width="full" gap={4} alignItems="center">
        <PMSeparator flex="1" />
        <PMText variant="small" color="secondary">
          Or continue with
        </PMText>
        <PMSeparator flex="1" />
      </PMHStack>
      <SocialLoginButtons />
    </>
  );
}
