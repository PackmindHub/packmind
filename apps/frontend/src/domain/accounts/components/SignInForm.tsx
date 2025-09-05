import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMLabel } from '@packmind/ui';
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

  // Check username availability when username changes (with debounce)
  useEffect(() => {
    if (username.trim().length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsernameMutation.mutate(username.trim());
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [username, checkUsernameMutation]);

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
          disabled={signInMutation.isPending}
          error={getUsernameError()}
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
          disabled={signInMutation.isPending}
          error={errors.password}
        />

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
