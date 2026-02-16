import {
  ListPackagesBySpaceResponse,
  OrganizationId,
  Package,
  PackageId,
} from '@packmind/types';
import { Outlet, redirect } from 'react-router';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getPackageByIdOptions,
  getPackagesBySpaceQueryOptions,
} from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; packageId: string };
}) {
  // Fetch user data - ensureQueryData uses cache if available, fetches otherwise
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  // Fetch space data - ensureQueryData uses cache if available, fetches otherwise
  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id),
  );
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

export default function PackageDetailsRouteModule() {
  return <Outlet />;
}
