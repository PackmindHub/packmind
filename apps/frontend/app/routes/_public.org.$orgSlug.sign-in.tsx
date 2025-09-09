import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  PMButton,
  PMHeading,
  PMText,
  PMVStack,
  PMBox,
  PMAlert,
  PMHStack,
} from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import { organizationGateway } from '../../src/domain/accounts/api/gateways';
import { Organization } from '@packmind/accounts/types';
import SignInForm from '../../src/domain/accounts/components/SignInForm';

export default function SignInRoute() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { isAuthenticated, isLoading } = useIsAuthenticated();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isLoading && isAuthenticated && organization) {
      navigate(`/org/${organization.slug}`);
    }
  }, [isAuthenticated, isLoading, organization, navigate]);

  useEffect(() => {
    async function fetchOrganization() {
      if (!orgSlug) {
        setOrganizationError('Organization slug is required');
        setOrganizationLoading(false);
        return;
      }

      try {
        setOrganizationLoading(true);
        const org = await organizationGateway.getBySlug(orgSlug);
        setOrganization(org);
        setOrganizationError(null);
      } catch (error) {
        console.error('Failed to fetch organization:', error);
        setOrganizationError('Organization not found');
        setOrganization(null);
      } finally {
        setOrganizationLoading(false);
      }
    }

    fetchOrganization();
  }, [orgSlug]);

  if (isLoading || organizationLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  if (organizationError || !organization) {
    return (
      <PMVStack gap={6} align="stretch">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>
            {organizationError || 'The organization could not be found.'}
          </PMAlert.Title>
        </PMAlert.Root>

        <PMButton onClick={() => navigate('/get-started')} variant="tertiary">
          Back to sign in page
        </PMButton>
      </PMVStack>
    );
  }

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Sign in to {organization.name}</PMHeading>
      </PMBox>

      <SignInForm organization={organization} />

      <PMHStack justifyContent={'space-between'} paddingX={6}>
        <PMButton
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/get-started`)}
        >
          &lt; Change organization
        </PMButton>
        <PMHStack>
          <PMText>No access?</PMText>

          <PMButton
            variant="tertiary"
            size="xs"
            onClick={() => navigate(`/org/${orgSlug}/sign-up`)}
          >
            Join
          </PMButton>
        </PMHStack>
      </PMHStack>
    </PMVStack>
  );
}
