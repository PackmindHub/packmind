import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMInput,
  PMButton,
  PMFormContainer,
  PMField,
  PMNativeSelect,
} from '@packmind/ui';
import {
  useSignInMutation,
  useSelectOrganizationMutation,
} from '../api/queries/AuthQueries';
import { SignInUserResponse } from '@packmind/accounts/types';
import { isPackmindError } from '../../../services/api/errors/PackmindError';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOrganizationSlug, setSelectedOrganizationSlug] = useState('');
  const [signInResult, setSignInResult] = useState<SignInUserResponse | null>(
    null,
  );
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    organization?: string;
    form?: string;
  }>({});

  const signInMutation = useSignInMutation();
  const selectOrganizationMutation = useSelectOrganizationMutation();
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
          // If user belongs to a single organization, redirect immediately
          if (data.organization) {
            navigate(`/org/${data.organization.slug}`);
          } else if (data.organizations && data.organizations.length > 0) {
            // Store the result to show organization selection
            setSignInResult(data);
          } else {
            setErrors({ form: 'No organizations found for this user' });
          }
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

  const handleOrganizationSelect = () => {
    if (!selectedOrganizationSlug || !signInResult) {
      setErrors({ organization: 'Please select an organization' });
      return;
    }

    // Find the selected organization from the results to get its ID
    const selectedOrg = signInResult.organizations?.find(
      (org) => org.organization.slug === selectedOrganizationSlug,
    );

    if (!selectedOrg) {
      setErrors({ organization: 'Selected organization not found' });
      return;
    }

    // Call the selectOrganization API
    selectOrganizationMutation.mutate(
      { organizationId: selectedOrg.organization.id },
      {
        onSuccess: () => {
          // Navigate to the selected organization
          navigate(`/org/${selectedOrganizationSlug}`);
        },
        onError: (error) => {
          // Use the actual error message from the server when available
          let errorMessage = 'Failed to select organization';

          if (isPackmindError(error)) {
            errorMessage = error.serverError.data.message;
          }

          setErrors({ organization: errorMessage });
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

  // If we have multiple organizations, show organization selection
  if (
    signInResult &&
    signInResult.organizations &&
    signInResult.organizations.length > 0
  ) {
    const organizationItems = signInResult.organizations.map(
      ({ organization, role }) => ({
        label: `${organization.name} (${role})`,
        value: organization.slug,
      }),
    );

    return (
      <PMFormContainer spacing={4} maxWidth="full">
        <PMField.Root required invalid={!!errors.organization}>
          <PMField.Label>
            Select Organization
            <PMField.RequiredIndicator />
          </PMField.Label>

          <PMNativeSelect
            items={[
              { label: 'Choose an organization', value: '', disabled: false },
              ...organizationItems,
            ]}
            value={selectedOrganizationSlug}
            onChange={(e) => setSelectedOrganizationSlug(e.target.value)}
          />

          <PMField.ErrorText>{errors.organization}</PMField.ErrorText>
        </PMField.Root>

        <PMButton
          onClick={handleOrganizationSelect}
          disabled={selectOrganizationMutation.isPending}
        >
          {selectOrganizationMutation.isPending
            ? 'Selecting...'
            : 'Continue to Organization'}
        </PMButton>
      </PMFormContainer>
    );
  }

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

        <PMButton type="submit" disabled={signInMutation.isPending}>
          {signInMutation.isPending ? 'Signing In...' : 'Sign In'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
