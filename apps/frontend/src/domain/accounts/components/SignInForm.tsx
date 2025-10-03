import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { SignInUserResponse } from '@packmind/accounts/types';
import SignInCredentialsForm from './SignInCredentialsForm';
import OrganizationSelectionForm from './OrganizationSelectionForm';
import OrganizationCreationForm from './OrganizationCreationForm';

export default function SignInForm() {
  const [signInResult, setSignInResult] = useState<SignInUserResponse | null>(
    null,
  );
  const navigate = useNavigate();

  const handleSignInSuccess = (data: SignInUserResponse) => {
    // If user belongs to a single organization, redirect immediately
    if (data.organization) {
      navigate(`/org/${data.organization.slug}`);
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
    return <OrganizationSelectionForm signInResult={signInResult} />;
  }

  // Default: show sign-in form
  return <SignInCredentialsForm onSignInSuccess={handleSignInSuccess} />;
}
