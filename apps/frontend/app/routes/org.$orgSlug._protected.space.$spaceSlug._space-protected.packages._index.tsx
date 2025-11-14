import { useParams } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { PackagesPage } from '../../src/domain/deployments/components/PackagesPage';

export default function PackagesRouteModule() {
  const { spaceSlug, orgSlug } = useParams() as {
    spaceSlug: string;
    orgSlug: string;
  };

  return (
    <PMPage
      title="Packages"
      subtitle="View all packages in this space"
      breadcrumbComponent={<AutobreadCrumb />}
    >
      <PMVStack align="stretch" gap={6}>
        <PackagesPage spaceSlug={spaceSlug} orgSlug={orgSlug} />
      </PMVStack>
    </PMPage>
  );
}
