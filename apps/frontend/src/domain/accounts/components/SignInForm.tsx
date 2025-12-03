import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { SignInUserResponse } from '@packmind/types';
import SignInCredentialsForm from './SignInCredentialsForm';
import OrganizationSelectionForm from './OrganizationSelectionForm';
import OrganizationCreationForm from './OrganizationCreationForm';
import { routes } from '../../../shared/utils/routes';

export default function SignInForm() {
  const [signInResult, setSignInResult] = useState<SignInUserResponse | null>(
    null,
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const getRedirectUrl = (orgSlug: string) => {
    // If returnUrl is provided and starts with /, use it (must be an internal path)
    if (returnUrl && returnUrl.startsWith('/')) {
      return returnUrl;
    }
    return routes.org.toDashboard(orgSlug);
  };

  const handleSignInSuccess = (data: SignInUserResponse) => {
    // If user belongs to a single organization, redirect immediately
    if (data.organization) {
      navigate(getRedirectUrl(data.organization.slug));
    } else if (data.organizations) {
      // Store the result to show organization selection
      setSignInResult(data);
    }
  };

  // If user has no organizations, show organization creation form
  if (
    signInResult &&
    !signInResult.organization &&
    signInResult.organizations?.length === 0
  ) {
    return <OrganizationCreationForm />;
  }

  // If we have multiple organizations, show organization selection
  if (signInResult?.organizations && signInResult.organizations.length > 0) {
    return (
      <OrganizationSelectionForm
        signInResult={signInResult}
        returnUrl={returnUrl}
      />
    );
  }

  // Default: show sign-in form
  return <SignInCredentialsForm onSignInSuccess={handleSignInSuccess} />;
}
