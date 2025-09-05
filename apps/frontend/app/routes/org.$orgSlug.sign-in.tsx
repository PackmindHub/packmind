import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PMPage, PMButton } from '@packmind/ui';
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
      <PMPage title="Organization Not Found">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>
            {organizationError ||
              'The requested organization could not be found.'}
          </p>
          <button onClick={() => navigate('/get-started')}>
            Create New Organization
          </button>
        </div>
      </PMPage>
    );
  }

  return (
    <PMPage
      title={`Sign In to ${organization.name}`}
      subtitle="Enter your credentials to access your account"
    >
      <SignInForm organization={organization} />

      <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem' }}>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Don't have an account?
        </p>
        <PMButton
          variant="outline"
          size="sm"
          onClick={() => navigate(`/org/${orgSlug}/sign-up`)}
        >
          Create Account
        </PMButton>
      </div>
    </PMPage>
  );
}
