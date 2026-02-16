import { useParams } from 'react-router';
import { PMPage, PMVStack } from '@packmind/ui';
import { CreatePackagePage } from '../../src/domain/deployments/components/CreatePackagePage';

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
