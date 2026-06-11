import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getListActiveDistributedPackagesBySpaceOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { DeploymentsOverviewRedesign } from '../../src/domain/deployments/components/redesign/DeploymentsOverviewRedesign';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug!, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }
  await queryClient.ensureQueryData(
    getListActiveDistributedPackagesBySpaceOptions(
      me.organization.id,
      space.id,
    ),
  );
  return null;
}

export default function SpaceDeploymentsOverviewRedesignRouteModule() {
  return <DeploymentsOverviewRedesign />;
}
