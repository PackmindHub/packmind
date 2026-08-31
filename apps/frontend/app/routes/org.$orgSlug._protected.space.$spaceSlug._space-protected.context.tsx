import type { LoaderFunctionArgs } from 'react-router';
import { PMFullBleedPage } from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getPackagesBySpaceQueryOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { SpaceContextSurface } from '../../src/domain/deployments/components/context';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug!, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }
  await queryClient.ensureQueryData(
    getPackagesBySpaceQueryOptions(space.id, me.organization.id),
  );
  return null;
}

/**
 * The content of a space, indexed by the package that carries it.
 *
 * "Context", not "Packages": everything a package holds is a file a coding
 * agent reads, so the page is named after what the user curates rather than
 * after the container it ships in. The package keeps its name one level down,
 * in the rail, where it does mean something — the unit that is distributed.
 *
 * Full bleed, so the surface gets the whole content area. A page heading here
 * would name what the sidebar already has highlighted, and it would take that
 * name out of the height the rail and the pane are asking for: on a 14 inch
 * laptop the heading and its subtitle cost about a sixth of the window before
 * the first row of anything.
 *
 * Only the packages are prefetched. The three catalogues the pane crosses them
 * with are fetched by the surface: they are needed to fill the selected package,
 * not to draw the screen, and blocking the route on all four would make Context
 * the slowest entry of a navigation whose first entry it is.
 */
export default function SpaceContextRouteModule() {
  return (
    <PMFullBleedPage>
      <SpaceContextSurface />
    </PMFullBleedPage>
  );
}
