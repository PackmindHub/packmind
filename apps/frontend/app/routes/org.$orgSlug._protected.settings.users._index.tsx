import { NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { UsersPage } from '../../src/domain/accounts/components/UsersPage';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  breadcrumb: ({ params }: { params: { orgSlug: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/settings/users`}>Users</NavLink>
    );
  },
};

export default function SettingsUsersRouteModule() {
  const { organization } = useAuthContext();

  if (!organization) {
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
