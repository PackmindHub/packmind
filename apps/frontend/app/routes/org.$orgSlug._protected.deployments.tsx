import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { DeploymentsPage } from '../../src/domain/deployments/components/DeploymentsPage';

export default function DeploymentsOverviewRouteModule() {
  return (
    <PMPage
      title="Overview"
      subtitle="Monitor distributions across your repositories"
    >
      <PMVStack align="stretch" gap={6}>
        <DeploymentsPage />
      </PMVStack>
    </PMPage>
  );
}
