import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PMPage, PMButton } from '@packmind/ui';
import { useIsAuthenticated } from '../../src/domain/accounts/hooks/useIsAuthenticated';
import { organizationGateway } from '../../src/domain/accounts/api/gateways';
import { Organization } from '@packmind/accounts/types';
import SignUpForm from '../../src/domain/accounts/components/SignUpForm';

export default function SignUpRoute() {
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
      title={`Join ${organization.name}`}
      subtitle="Create your account to get started"
    >
      <SignUpForm organization={organization} />

      <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem' }}>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Already have an account?
        </p>
        <PMButton
          variant="outline"
          size="sm"
          onClick={() => navigate(`/org/${orgSlug}/sign-in`)}
        >
          Sign in
        </PMButton>
      </div>
    </PMPage>
  );
}
