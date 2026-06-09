import { PMPage } from '@packmind/ui';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { GitProvidersPage } from '../../src/domain/git/components';

export default function SettingsGitRouteModule() {
  const { organization } = useAuthContext();

  if (!organization) {
    return null;
  }

  return (
    <PMPage
      title="Git connections"
      subtitle="Grant Packmind access to specific repos. Each connection is the bridge that lets Packmind publish your playbooks on your team's behalf."
      isFullWidth
    >
      <GitProvidersPage organizationId={organization.id} />
    </PMPage>
  );
}
