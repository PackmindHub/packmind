import { NavLink, useParams } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { CreatePackagePage } from '../../src/domain/deployments/components/CreatePackagePage';

export const handle = {
  crumb: ({ params }: { params: { orgSlug: string; spaceSlug: string } }) => {
    return (
      <NavLink
        to={`/org/${params.orgSlug}/space/${params.spaceSlug}/packages/new`}
      >
        New Package
      </NavLink>
    );
  },
};

export default function CreatePackageRouteModule() {
  const { orgSlug, spaceSlug } = useParams() as {
    orgSlug: string;
    spaceSlug: string;
  };

  return (
    <PMPage
      title="Create Package"
      subtitle="Create a new package with standards, commands and skills"
    >
      <PMVStack align="stretch" gap={6}>
        <CreatePackagePage organizationSlug={orgSlug} spaceSlug={spaceSlug} />
      </PMVStack>
    </PMPage>
  );
}
