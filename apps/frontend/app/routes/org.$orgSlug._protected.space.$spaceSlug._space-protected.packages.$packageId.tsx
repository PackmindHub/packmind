import { Package, PackageId } from '@packmind/types';
import { NavLink, Outlet } from 'react-router';
import { getPackageByIdOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { OrganizationId, GetPackageByIdResponse } from '@packmind/types';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; packageId: string };
}) {
  const me = await queryClient.fetchQuery(getMeQueryOptions());
  const space = await queryClient.fetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization?.id || ''),
  );

  const packageData = await queryClient.ensureQueryData(
    getPackageByIdOptions(
      me.organization?.id as OrganizationId,
      space.id,
      params.packageId as PackageId,
    ),
  );
  return packageData;
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; spaceSlug: string; packageId: string };
    data: GetPackageByIdResponse;
  }) => {
    const packageId = params.packageId;
    return (
      <NavLink
        to={routes.space.toPackage(params.orgSlug, params.spaceSlug, packageId)}
      >
        {data.package.name}
      </NavLink>
    );
  },
};

export default function PackageDetailsRouteModule() {
  return <Outlet />;
}
