import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { PMInput, PMButton, PMFormContainer, PMField } from '@packmind/ui';
import { useSignInMutation } from '../api/queries/AuthQueries';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});

  const signInMutation = useSignInMutation();
  const navigate = useNavigate();

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

    signInMutation.mutate(
      {
        email: email.trim(),
        password,
      },
      {
        onSuccess: (data) => {
          // Redirect to organization homepage using the returned organization
          navigate(`/org/${data.organization.slug}`);
        },
        onError: () => {
          setErrors({ form: 'Invalid email or password' });
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

        {signInMutation.error && !errors.form && (
          <div style={{ color: 'red', marginTop: 8 }}>
            Failed to sign in. Please check your credentials and try again.
          </div>
        )}

        <PMButton type="submit" disabled={signInMutation.isPending}>
          {signInMutation.isPending ? 'Signing In...' : 'Sign In'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
