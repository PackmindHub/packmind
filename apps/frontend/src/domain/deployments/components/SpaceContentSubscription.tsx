import { useCallback, useEffect, useMemo, useRef } from 'react';
import { queryClient } from '../../../shared/data/queryClient';
import { useSSESubscription } from '../../sse';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';
import { GET_RULES_BY_STANDARD_ID_KEY } from '../../standards/api/queryKeys';
import {
  GET_PACKAGE_BY_ID_KEY,
  GET_PACKAGE_RELEASE_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
  LIST_PACKAGE_RELEASES_KEY,
} from '../api/queryKeys';

/**
 * How long a burst is given to finish before anything is refetched.
 *
 * Importing a folder of skills creates them one at a time and announces each
 * one, so a twenty-skill import is twenty events a second or two apart. Acted
 * on individually they are twenty rounds of refetching to reach a state only
 * the last one describes. The wait is short enough to read as immediate and
 * long enough to collapse an import into one refresh.
 */
const BURST_MS = 400;

/**
 * Keeps a space content surface showing the space as it is rather than as it
 * was when the page was opened.
 *
 * Package membership is decided against what the screen shows: the picker
 * offers the components no package carries, and the move drawer names the
 * package a component would leave. Both read lists fetched once. Two people
 * working in the same space — or one person with it open in two tabs —
 * therefore chose from two pictures that had each stopped being true, and a
 * component could be placed twice because neither screen had any way of hearing
 * about the other.
 *
 * Mounted per surface rather than at the root, unlike the two subscriptions
 * that live there: this one is scoped to a space, and the root has no space to
 * scope it to. Where it is mounted is also where it is worth the connection.
 *
 * It carries nothing from the event but the fact that something changed. The
 * payload could not be trusted for more even if it said more, since a
 * subscriber is not checked against the space it names; the refetch goes
 * through the endpoints that do check.
 */
export function SpaceContentSubscription(): null {
  const { spaceId, space } = useCurrentSpace();
  const organizationId = space?.organizationId;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleSpaceContentChanged = useCallback(() => {
    if (!spaceId) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      /*
       * The memberships and the catalogues they are resolved against, together.
       *
       * A package holds ids; a row is drawn by finding each id in the space's
       * standards, commands and skills. Refetching only the memberships
       * therefore moved a package's count without adding the row, which is what
       * a reader saw when someone else created a component straight into the
       * package they were both looking at.
       *
       * The space prefix rather than a list of a dozen keys: every query the
       * three component domains scope to a space hangs off it — each catalogue,
       * and the by-id and by-slug reads the detail pane makes — and enumerating
       * them is a list that would be wrong the first time one is added. It
       * reaches no further than that: the space's own record is keyed by
       * `detail` and `list` in that position, not by an id, so the surface does
       * not pull the ground out from under itself.
       *
       * Packages hang off a different scope and are named separately, and so
       * are a standard's rules, whose key is not space-scoped at all. Neither
       * is the whole deployments scope invalidated: it also holds the
       * distribution history, which no content change can affect and which is
       * the most expensive thing on the page to fetch again.
       *
       * The releases are here because whether a package is behind what it holds
       * is answered by comparing the two, and both sides move: a component
       * gains a version, or someone cuts the release that catches up with it. A
       * reader who heard only the first would be told to cut a release that had
       * just been cut.
       */
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [ORGANIZATION_QUERY_SCOPE, SPACES_SCOPE, spaceId],
        }),
        queryClient.invalidateQueries({ queryKey: LIST_PACKAGES_BY_SPACE_KEY }),
        queryClient.invalidateQueries({ queryKey: GET_PACKAGE_BY_ID_KEY }),
        queryClient.invalidateQueries({
          queryKey: GET_RULES_BY_STANDARD_ID_KEY,
        }),
        queryClient.invalidateQueries({ queryKey: LIST_PACKAGE_RELEASES_KEY }),
        queryClient.invalidateQueries({ queryKey: GET_PACKAGE_RELEASE_KEY }),
      ]).catch((error) => {
        console.error('SSE: Failed to refresh the space after a change', {
          error,
        });
      });
    }, BURST_MS);
  }, [spaceId]);

  const params = useMemo(() => (spaceId ? [spaceId] : []), [spaceId]);

  useSSESubscription({
    eventType: 'SPACE_CONTENT_CHANGED',
    params,
    onEvent: handleSpaceContentChanged,
    enabled: !!spaceId && !!organizationId,
  });

  return null;
}
