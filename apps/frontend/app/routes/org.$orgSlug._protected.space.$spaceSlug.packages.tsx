import { NavLink, useParams } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { PackagesPage } from '../../src/domain/deployments/components/PackagesPage';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink to={`/org/${params.orgSlug}/space/${params.spaceSlug}/packages`}>
        Packages
      </NavLink>
    );
  },
};

export default function PackagesRouteModule() {
  const { spaceSlug } = useParams() as { spaceSlug: string };

  return (
    <PMPage
      title="Packages"
      subtitle="View all packages in this space"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <PackagesPage spaceSlug={spaceSlug} />
      </PMVStack>
    </PMPage>
  );
}
