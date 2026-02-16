import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { SignInUserResponse } from '@packmind/types';
import { PMAlert } from '@packmind/ui';
import SignInCredentialsForm from './SignInCredentialsForm';
import OrganizationSelectionForm from './OrganizationSelectionForm';
import OrganizationCreationForm from './OrganizationCreationForm';
import { routes } from '../../../shared/utils/routes';
import { useGetMeQuery } from '../api/queries/UserQueries';

export default function SignInForm() {
  const [signInResult, setSignInResult] = useState<SignInUserResponse | null>(
    null,
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const socialError = searchParams.get('error');
  const socialSelectOrg = searchParams.get('social');

  const isSocialOrgSelection = socialSelectOrg === 'select-org';
  const { data: meData } = useGetMeQuery();

  // Handle social login org selection: when ?social=select-org is present
  // and we get meData with organizations, set signInResult to trigger org selection UI
  useEffect(() => {
    if (!isSocialOrgSelection || !meData?.authenticated) return;

    const result: SignInUserResponse = {
      user: {
        ...meData.user,
        passwordHash: null, // Social login users don't have passwords
        active: true, // User is authenticated
        trial: false, // Default value
      },
      organizations: meData.organizations,
    };
    setSignInResult(result);
  }, [isSocialOrgSelection, meData]);

  const getRedirectUrl = (orgSlug: string) => {
    if (returnUrl && returnUrl.startsWith('/')) {
      return returnUrl;
    }
    return routes.org.toDashboard(orgSlug);
  };

  const handleSignInSuccess = (data: SignInUserResponse) => {
    if (data.organization) {
      navigate(getRedirectUrl(data.organization.slug));
    } else if (data.organizations) {
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
  return (
    <>
      {socialError === 'social_login_failed' && (
        <PMAlert.Root status="error" mb={4}>
          <PMAlert.Indicator />
          <PMAlert.Title>
            Social login failed. Please try again or use email/password.
          </PMAlert.Title>
        </PMAlert.Root>
      )}
      <SignInCredentialsForm onSignInSuccess={handleSignInSuccess} />
    </>
  );
}
