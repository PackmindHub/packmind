import { PMPage } from '@packmind/ui';
import { useSearchParams } from 'react-router';
import { useAuthContext } from '../../src/domain/accounts/hooks';
import { GitProvidersPage } from '../../src/domain/git/components';

export default function SettingsGitRouteModule() {
  const { organization } = useAuthContext();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? undefined;

  if (!organization) {
    return null;
  }

  return (
    <PMPage title="Git" subtitle="Manage your git providers and repositories">
      <GitProvidersPage organizationId={organization.id} defaultTab={tab} />
    </PMPage>
  );
}
