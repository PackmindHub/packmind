import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { UsersPage } from '../../src/domain/accounts/components/UsersPage';

export default function SettingsUsersRouteModule() {
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  return (
    <PMPage title="Users" subtitle="Manage your organization users">
      <UsersPage organizationId={organization.id} />
    </PMPage>
  );
}
