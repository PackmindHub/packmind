import { useParams, Link } from 'react-router';
import { PMPage, PMButton, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks/useAuthContext';
import { StandardsList } from '../../src/domain/standards/components/StandardsList';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export default function OrgStandardsIndex() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
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
        spaceSlug && (
          <Link
            to={routes.space.toCreateStandard(organization.slug, spaceSlug)}
          >
            <PMButton>Create</PMButton>
          </Link>
        )
      }
    >
      <PMVStack align="stretch" gap={6}>
        <StandardsList orgSlug={organization.slug} />
      </PMVStack>
    </PMPage>
  );
}
