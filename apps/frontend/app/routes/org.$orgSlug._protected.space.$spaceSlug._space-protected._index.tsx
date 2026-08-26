import { redirect, type LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getListActiveDistributedPackagesBySpaceOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { SpaceOverviewPage } from '../../src/domain/spaces/components/overview/SpaceOverviewPage';
import { resolveSpaceNavMode } from '../../src/domain/organizations/components/SpaceNavModeContext';
import { routes } from '../../src/shared/utils/routes';

export async function clientLoader({ params, request }: LoaderFunctionArgs) {
  /*
   * Overview has no entry in the plugin-first navigation, and clicking a space
   * lands here, so in that mode this route would be a page the sidebar does not
   * list. Send it to the first entry instead, before fetching anything the
   * redirect would throw away.
   *
   * Who is asking comes first, because the default mode depends on it and the
   * sidebar resolves the same way: answering without the email here would send
   * a beta member to a page their own navigation does not list. It costs no
   * request — the protected layout's middleware has already ensured the org
   * context, so this reads the query cache.
   *
   * `nav` is carried over when it is what put us in this mode, so a pinned demo
   * link survives the redirect.
   */
  const me = await ensureOrgContext(params.orgSlug!);
  const url = new URL(request.url);
  if (resolveSpaceNavMode(url.search, me.user?.email) === 'plugin-first') {
    const target = routes.space.toContext(params.orgSlug!, params.spaceSlug!);
    const requested = url.searchParams.get('nav');
    return redirect(requested ? `${target}?nav=${requested}` : target);
  }

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

export default function SpaceOverviewRouteModule() {
  return <SpaceOverviewPage />;
}
