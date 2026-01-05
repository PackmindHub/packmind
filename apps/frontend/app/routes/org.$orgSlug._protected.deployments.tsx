import { NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { DeploymentsPage } from '../../src/domain/deployments/components/DeploymentsPage';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return (
      <NavLink to={routes.org.toDeployments(params.orgSlug)}>Overview</NavLink>
    );
  },
};

export default function DeploymentsOverviewRouteModule() {
  return (
    <PMPage
      title="Overview"
      subtitle="Monitor distributions across your repositories"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <DeploymentsPage />
      </PMVStack>
    </PMPage>
  );
}
