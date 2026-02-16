import { useParams } from 'react-router';
import { PackageEditForm } from '../../src/domain/deployments/components/PackageEditForm';
import { PackageId } from '@packmind/types';

export default function EditPackageRouteModule() {
  const { orgSlug, spaceSlug, packageId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    packageId: string;
  }>();

  if (!orgSlug || !spaceSlug || !packageId) {
    return null;
  }

  return (
    <PackageEditForm
      id={packageId as PackageId}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  );
}
