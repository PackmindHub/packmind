import type { LoaderFunctionArgs } from 'react-router';
import { PMPage } from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getListActiveDistributedPackagesBySpaceOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { DeploymentsOverviewRedesignContent } from '../../src/domain/deployments/components/redesign/DeploymentsOverviewRedesign';

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

/**
 * The distribution graph of a space, indexed by destination rather than by
 * package. It gets an address of its own because the question it answers —
 * "what is behind in this repository" — spans packages, so no screen scoped to
 * one package can answer it.
 *
 * The surface is the one already rendered inside Overview, unchanged and fed by
 * the same query. Only the frame around it differs: its own title, and no
 * backlink to the deployments page.
 */
export default function SpaceDistributionRouteModule() {
  return (
    <PMPage
      title="Distribution"
      subtitle="Where this space's packages landed, and which destinations are behind."
      isFullWidth
    >
      <DeploymentsOverviewRedesignContent />
    </PMPage>
  );
}
