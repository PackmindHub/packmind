import type { LoaderFunctionArgs } from 'react-router';
import { PMFullBleedPage } from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getListActiveDistributedPackagesBySpaceOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { SpaceDistributionSurface } from '../../src/domain/deployments/components/destinations/SpaceDistributionSurface';

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
 * It used to render the surface Overview mounts, which asks that question three
 * ways behind a tab strip. It now renders the destination-indexed one: the
 * package slice moved into Context, where a package's landings are a tab of the
 * package itself, and repositories and marketplaces are one list. The tab
 * surface stays untouched for the navigation this one replaces.
 *
 * Full bleed, as Context is, and the same reasoning applies word for word: the
 * surface is a rail beside a pane, it says where the reader is through its own
 * content and through the navigation that got them here, and the heading it
 * used to carry named what the sidebar already has highlighted. On a 14 inch
 * laptop that heading and its subtitle cost about a sixth of the window before
 * the first row of either region.
 *
 * The subtitle is not lost with it. "Which destinations are behind" was the
 * half worth keeping, and it is a number rather than a sentence: it now sits in
 * the rail, under the search field, where clicking it filters the list down to
 * the destinations it counts.
 */
export default function SpaceDistributionRouteModule() {
  return (
    <PMFullBleedPage>
      <SpaceDistributionSurface />
    </PMFullBleedPage>
  );
}
