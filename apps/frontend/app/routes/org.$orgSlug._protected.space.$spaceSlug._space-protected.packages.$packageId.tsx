import {
  GetPackageByIdResponse,
  ListPackagesBySpaceResponse,
  OrganizationId,
  Package,
  PackageId,
  Space,
} from '@packmind/types';
import { NavLink, Outlet, redirect } from 'react-router';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getPackageByIdOptions,
  getPackagesBySpaceQueryOptions,
} from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { MeResponse } from '../../src/domain/accounts/api/gateways/IAuthGateway';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; packageId: string };
}) {
  // Get cached data from parent loaders without blocking
  const me = queryClient.getQueryData(getMeQueryOptions().queryKey) as
    | MeResponse
    | undefined;
  if (!me?.organization) {
    throw new Error('Organization not found');
  }

  // Get space from cache - parent loader ensures this is loaded
  const space = queryClient.getQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id).queryKey,
  ) as Space | undefined;
  if (!space) {
    throw new Error('Space not found');
  }

  const packagesResponse =
    await queryClient.ensureQueryData<ListPackagesBySpaceResponse>(
      getPackagesBySpaceQueryOptions(space.id, me.organization.id),
    );
  const packagesList: Package[] = Array.isArray(packagesResponse)
    ? packagesResponse
    : (packagesResponse?.packages ?? []);
  const packageExists = packagesList.some(
    (candidate) => candidate.id === params.packageId,
  );

  if (!packageExists) {
    throw redirect(routes.org.toDashboard(me.organization.slug));
  }

  return queryClient.ensureQueryData(
    getPackageByIdOptions(
      me.organization.id as OrganizationId,
      space.id,
      params.packageId as PackageId,
    ),
  );
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
