import { useParams, NavLink } from 'react-router';
import { PackageEditForm } from '../../src/domain/deployments/components/PackageEditForm';
import { PackageId } from '@packmind/types';
import { routes } from '../../src/shared/utils/routes';

export const handle = {
  crumb: ({
    params,
  }: {
    params: { orgSlug: string; spaceSlug: string; packageId: string };
  }) => {
    return (
      <NavLink
        to={routes.space.toPackageEdit(
          params.orgSlug,
          params.spaceSlug,
          params.packageId,
        )}
      >
        Edit
      </NavLink>
    );
  },
};

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
