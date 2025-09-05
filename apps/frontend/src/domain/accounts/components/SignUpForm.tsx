import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMLabel } from '@packmind/ui';
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

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer maxWidth="500px" spacing={4}>
        <PMLabel htmlFor={usernameId} required>
          Username
        </PMLabel>
        <PMInput
          id={usernameId}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          disabled={signUpMutation.isPending || signInMutation.isPending}
          error={errors.username}
        />

        <PMLabel htmlFor={passwordId} required>
          Password
        </PMLabel>
        <PMInput
          id={passwordId}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          disabled={signUpMutation.isPending || signInMutation.isPending}
          error={errors.password}
        />

        <PMLabel htmlFor={confirmPasswordId} required>
          Confirm Password
        </PMLabel>
        <PMInput
          id={confirmPasswordId}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          disabled={signUpMutation.isPending || signInMutation.isPending}
          error={errors.confirmPassword}
        />

        {signUpMutation.error && (
          <div style={{ color: 'red', marginTop: 8 }}>
            Failed to create account. Please try again.
          </div>
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
