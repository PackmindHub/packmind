import { NavLink, useParams } from 'react-router';
import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { GitProvidersPage } from '../../src/domain/git/components';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return <NavLink to={`/org/${params.orgSlug}/settings/git`}>Git</NavLink>;
  },
};

export default function SettingsGitRouteModule() {
  const { orgSlug } = useParams();
  const { organization } = useAuthContext();

  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  return (
    <PMPage
      title="Git"
      subtitle="Manage your git providers and repositories"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <GitProvidersPage organizationId={organization.id} />
    </PMPage>
  );
}
