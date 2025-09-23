import { useParams, useNavigate, Link } from 'react-router';
import { useEffect } from 'react';
import { PMPage, PMButton, PMVStack, PMBox, PMSpinner } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardsList } from '../../src/domain/standards/components/StandardsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export default function OrgStandardsIndex() {
  const { orgSlug } = useParams();
  const { organization } = useAuthContext();

  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  return (
    <PMPage
      title="Standards"
      subtitle="Create and manage your standards"
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <Link to={`/org/${organization.slug}/standards/create`}>
          <PMButton>Create</PMButton>
        </Link>
      }
    >
      <PMVStack align="stretch" gap={6}>
        <StandardsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
