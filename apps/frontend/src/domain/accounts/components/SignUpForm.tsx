import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMText,
  PMAlert,
} from '@packmind/ui';
import { Organization } from '@packmind/accounts/types';
import { useSignUpMutation, useSignInMutation } from '../api/queries';

interface SignUpFormProps {
  organization: Organization;
}

export default function SignUpForm({ organization }: SignUpFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const signUpMutation = useSignUpMutation();
  const signInMutation = useSignInMutation();
  const navigate = useNavigate();

  const getButtonText = () => {
    if (signUpMutation.isPending) return 'Creating Account...';
    if (signInMutation.isPending) return 'Signing In...';
    return 'Create Account';
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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

    signUpMutation.mutate(
      {
        username: username.trim(),
        password,
        organizationId: organization.id,
      },
      {
        onSuccess: () => {
          // Auto-login the user after successful registration
          signInMutation.mutate(
            {
              username: username.trim(),
              password,
              organizationId: organization.id,
            },
            {
              onSuccess: () => {
                // Redirect to organization dashboard after auto-login
                navigate(`/org/${organization.slug}`);
              },
              onError: (error) => {
                console.error('Auto-login failed after registration:', error);
                // Fallback to sign-in page if auto-login fails
                navigate(`/org/${organization.slug}/sign-in`);
              },
            },
          );
        },
      },
    );
  };

  const usernameId = 'signup-username';
  const passwordId = 'signup-password';
  const confirmPasswordId = 'signup-confirm-password';

  const USERNAME_MAX_LENGTH = 64;
  const PASSWORD_MAX_LENGTH = 128;

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="full" spacing={4}>
        <PMField.Root required invalid={!!errors.username}>
          <PMField.Label>
            Username{' '}
            <PMText as="span" variant="small" color="secondary">
              ({username.length} / {USERNAME_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>

          <PMInput
            id={usernameId}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            disabled={signUpMutation.isPending || signInMutation.isPending}
            maxLength={USERNAME_MAX_LENGTH}
          />
          <PMField.ErrorText>{errors.username}</PMField.ErrorText>
        </PMField.Root>

        <PMField.Root required invalid={!!errors.password}>
          <PMField.Label>
            Password{' '}
            <PMText as="span" variant="small" color="secondary">
              ({password.length} / {PASSWORD_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMInput
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={signUpMutation.isPending || signInMutation.isPending}
            maxLength={PASSWORD_MAX_LENGTH}
          />
          <PMField.ErrorText>{errors.password}</PMField.ErrorText>
        </PMField.Root>

        <PMField.Root required invalid={!!errors.confirmPassword}>
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
            disabled={signUpMutation.isPending || signInMutation.isPending}
            maxLength={PASSWORD_MAX_LENGTH}
          />
          <PMField.ErrorText>{errors.confirmPassword}</PMField.ErrorText>
        </PMField.Root>

        {signUpMutation.error && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>
              {signUpMutation.error.message ||
                'Failed to create account. Please try again.'}
            </PMAlert.Title>
          </PMAlert.Root>
        )}

        <PMButton
          type="submit"
          disabled={signUpMutation.isPending || signInMutation.isPending}
        >
          {getButtonText()}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
