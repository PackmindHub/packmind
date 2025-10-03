import { NavLink } from 'react-router';
import { PMPage } from '@packmind/ui';
import { PMVStack } from '@packmind/ui';
import { DeploymentsPage } from '../../src/domain/deployments/components/DeploymentsPage';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/deployments`}>Overview</NavLink>
    );
  },
};

export default function DeploymentsOverviewRouteModule() {
  return (
    <PMPage
      title="Overview"
      subtitle="Monitor recipe deployments across your repositories"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <DeploymentsPage />
      </PMVStack>
    </PMPage>
  );
}
