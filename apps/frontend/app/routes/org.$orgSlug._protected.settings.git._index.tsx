import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { GitProvidersPage } from '../../src/domain/git/components';

export default function SettingsGitRouteModule() {
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  return (
    <PMPage title="Git" subtitle="Manage your git providers and repositories">
      <GitProvidersPage organizationId={organization.id} />
    </PMPage>
  );
}
