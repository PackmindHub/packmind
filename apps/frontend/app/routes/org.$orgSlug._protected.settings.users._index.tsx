import { NavLink, useParams } from 'react-router';
import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { UsersPage } from '../../src/domain/accounts/components';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  breadcrumb: ({ params }: { params: { orgSlug: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/settings/users`}>Users</NavLink>
    );
  },
};

export default function SettingsUsersRouteModule() {
  const { orgSlug } = useParams();
  const { organization } = useAuthContext();

  if (!organization || orgSlug !== organization.slug) {
    return null;
  }

  return (
    <PMPage
      title="Users"
      subtitle="Manage your organization users"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <UsersPage organizationId={organization.id} />
    </PMPage>
  );
}
