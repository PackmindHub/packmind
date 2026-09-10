import { redirect, type LoaderFunctionArgs } from 'react-router';
import { queryClient } from './queryClient';
import {
  ensureOrgContext,
  type AuthenticatedMeWithOrganization,
} from './ensureOrgContext';
import { getSpaceBySlugQueryOptions } from '../../domain/spaces/api/queries/SpacesQueries';
import { getSkillBySlugQueryOptions } from '../../domain/skills/api/queries/SkillsQueries';
import {
  resolveSpaceNavMode,
  withNavMode,
} from '../../domain/organizations/components/SpaceNavModeContext';
import { contextComponentHref } from '../../domain/deployments/components/context/buildComponentDetail';

/**
 * Sends a reader who landed on a component's own page into the Context surface,
 * when the navigation they are reading has no entry for that page.
 *
 * The addresses these routes answer are in the wild and will stay there:
 * bookmarks, links in email, links out of Review changes, and everything the
 * product itself printed before the pane could show a component. In the
 * plugin-first navigation the page they open sits outside the sidebar, which is
 * the same pathology the `Open <type>` button had and the reason it is gone.
 *
 * Null rather than a redirect means "serve the page", which is what the current
 * navigation gets. Its pages are its component surface and the e2e suite proves
 * they still work.
 *
 * Who is asking comes first, because the default mode depends on it and the
 * sidebar resolves the same way: answering without the email would send a beta
 * member to a surface their own navigation does not list, or keep them off the
 * one it does. It costs no request, the protected layout's middleware having
 * already ensured the org context, so this reads the query cache.
 */
export async function redirectToContextComponent(
  { params, request }: LoaderFunctionArgs,
  /**
   * The component's key, or a way to find it.
   *
   * A function is allowed because one of the three types is not addressed by
   * the key: a skill's route names it by slug, and the pane names every
   * component by id. Resolving that costs a query, so it is asked for only
   * after the mode has been decided.
   */
  key:
    | string
    | ((me: AuthenticatedMeWithOrganization) => Promise<string | null>),
  /** The file of that component being read, when the address names one. */
  filePath?: string | null,
): Promise<Response | null> {
  const me = await ensureOrgContext(params.orgSlug as string);
  const url = new URL(request.url);
  if (resolveSpaceNavMode(url.search, me.user?.email) !== 'plugin-first') {
    return null;
  }

  const componentKey = typeof key === 'string' ? key : await key(me);
  /*
   * Nothing to open. The page is served instead of a redirect built around an
   * empty parameter, and the layout above it already knows how to answer for a
   * component that is gone.
   */
  if (!componentKey) {
    return null;
  }

  return redirect(
    withNavMode(
      contextComponentHref(
        {
          orgSlug: params.orgSlug as string,
          spaceSlug: params.spaceSlug as string,
        },
        componentKey,
        filePath,
      ),
      url.search,
    ),
  );
}

/**
 * The same, for the one type whose address is a slug rather than an id.
 *
 * The two queries are the ones the skill's own layout loader runs, with the
 * same keys, so React Query answers this from the request already in flight
 * rather than opening a second one. The redirect is not free the way the other
 * two are, but it costs nothing the page it replaces was not already spending.
 */
export async function redirectSkillToContextComponent(
  args: LoaderFunctionArgs,
  filePath?: string | null,
): Promise<Response | null> {
  return redirectToContextComponent(
    args,
    async (me) => {
      const space = await queryClient.fetchQuery(
        getSpaceBySlugQueryOptions(
          args.params.spaceSlug as string,
          me.organization.id,
        ),
      );
      if (!space) return null;

      const skill = await queryClient.fetchQuery(
        getSkillBySlugQueryOptions(
          me.organization.id,
          space.id,
          args.params.skillSlug as string,
        ),
      );
      return skill?.skill?.id ?? null;
    },
    filePath,
  );
}
