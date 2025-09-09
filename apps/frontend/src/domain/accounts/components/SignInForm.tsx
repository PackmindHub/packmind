import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMField } from '@packmind/ui';
import { Organization } from '@packmind/accounts/types';
import { useSignInMutation } from '../api/queries/AuthQueries';
import { useCheckUsernameMutation } from '../api/queries/UserQueries';

interface SignInFormProps {
  organization: Organization;
}

export default function SignInForm({ organization }: SignInFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    form?: string;
  }>({});

  const signInMutation = useSignInMutation();
  const checkUsernameMutation = useCheckUsernameMutation();
  const navigate = useNavigate();

  // Check username availability when username changes (with debounce and deduplication)
  const [lastCheckedUsername, setLastCheckedUsername] = useState<string | null>(
    null,
  );
  useEffect(() => {
    const trimmed = username.trim();
    if (
      trimmed.length >= 3 &&
      trimmed !== lastCheckedUsername &&
      !checkUsernameMutation.isPending
    ) {
      const timeoutId = setTimeout(() => {
        checkUsernameMutation.mutate(trimmed);
        setLastCheckedUsername(trimmed);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    // Reset lastCheckedUsername if username is too short
    if (trimmed.length < 3 && lastCheckedUsername !== null) {
      setLastCheckedUsername(null);
    }
  }, [username, lastCheckedUsername, checkUsernameMutation]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (
      checkUsernameMutation.data &&
      !checkUsernameMutation.data.exists
    ) {
      newErrors.username = 'Username does not exist';
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

    signInMutation.mutate(
      {
        username: username.trim(),
        password,
        organizationId: organization.id,
      },
      {
        onSuccess: () => {
          // Redirect to organization homepage
          navigate(`/org/${organization.slug}`);
        },
        onError: () => {
          setErrors({ form: 'Invalid username or password' });
        },
      },
    );
  };

  const usernameId = 'signin-username';
  const passwordId = 'signin-password';

  // Get username validation status
  const getUsernameError = () => {
    if (errors.username) return errors.username;
    if (
      username.trim().length >= 3 &&
      checkUsernameMutation.data &&
      !checkUsernameMutation.data.exists
    ) {
      return 'Username does not exist';
    }
    return undefined;
  };

  return (
    <form onSubmit={handleSubmit}>
      <PMFormContainer spacing={4} maxWidth="full">
        <PMField.Root required invalid={!!getUsernameError()}>
          <PMField.Label>
            Username
            <PMField.RequiredIndicator />
          </PMField.Label>

          <PMInput
            id={usernameId}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            disabled={signInMutation.isPending}
            error={getUsernameError()}
          />

          <PMField.ErrorText>{getUsernameError()}</PMField.ErrorText>
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

        {signInMutation.error && !errors.form && (
          <div style={{ color: 'red', marginTop: 8 }}>
            Failed to sign in. Please check your credentials and try again.
          </div>
        )}

        <PMButton
          type="submit"
          disabled={signInMutation.isPending || checkUsernameMutation.isPending}
        >
          {signInMutation.isPending ? 'Signing In...' : 'Sign In'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
