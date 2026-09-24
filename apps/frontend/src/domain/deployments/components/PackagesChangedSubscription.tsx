import { useCallback, useMemo } from 'react';
import { queryClient } from '../../../shared/data/queryClient';
import { useSSESubscription } from '../../sse';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';
import { getCommandsBySpaceKey } from '../../commands/api/queryKeys';
import { getSkillsBySpaceKey } from '../../skills/api/queryKeys';
import { getStandardsBySpaceKey } from '../../standards/api/queryKeys';
import {
  GET_PACKAGE_BY_ID_KEY,
  LIST_PACKAGES_BY_SPACE_KEY,
} from '../api/queryKeys';

/**
 * Keeps a package surface showing the space as it is rather than as it was when
 * the page was opened.
 *
 * Package membership is decided against what the screen shows: the picker
 * offers the components no package carries, and the move drawer names the
 * package a component would leave. Both read a list fetched once. Two people
 * working in the same space — or one person with the space open in two tabs —
 * therefore chose from two pictures that had each stopped being true, and a
 * component could be placed twice because neither screen had any way of hearing
 * about the other.
 *
 * Mounted per surface rather than at the root, unlike the two subscriptions
 * that live there: this one is scoped to a space, and the root has no space to
 * scope it to. Where it is mounted is also where it is worth the connection —
 * a reader on the standards list is not deciding anything about packages.
 *
 * It carries nothing from the event but the fact that something changed. The
 * payload could not be trusted for more even if it said more, since a
 * subscriber is not checked against the space it names; the refetch goes
 * through the endpoints that do check.
 */
export function PackagesChangedSubscription(): null {
  const { spaceId, space } = useCurrentSpace();
  const organizationId = space?.organizationId;

  const handlePackagesChanged = useCallback(() => {
    if (!spaceId) return;

    /*
     * The memberships and the catalogues they are resolved against, together.
     *
     * A package holds ids; the pane renders a row by finding each id in the
     * space's standards, commands and skills. Refetching only the memberships
     * therefore moved a package's count without adding the row, which is what a
     * reader saw when someone else created a component straight into the
     * package they were both looking at: the component was new, so their
     * catalogue had never heard of the id the package had just gained, and
     * `resolve` drops an id it cannot name.
     *
     * Five keys and not a whole scope, because the deployments scope also holds
     * the distribution history, which no package write can change and which is
     * the most expensive thing on the page to fetch again.
     */
    Promise.all([
      queryClient.invalidateQueries({ queryKey: LIST_PACKAGES_BY_SPACE_KEY }),
      queryClient.invalidateQueries({ queryKey: GET_PACKAGE_BY_ID_KEY }),
      queryClient.invalidateQueries({
        queryKey: getStandardsBySpaceKey(spaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: getCommandsBySpaceKey(spaceId),
      }),
      queryClient.invalidateQueries({ queryKey: getSkillsBySpaceKey(spaceId) }),
    ]).catch((error) => {
      console.error('SSE: Failed to refresh packages after a change', {
        error,
      });
    });
  }, [spaceId]);

  const params = useMemo(() => (spaceId ? [spaceId] : []), [spaceId]);

  useSSESubscription({
    eventType: 'PACKAGES_CHANGED',
    params,
    onEvent: handlePackagesChanged,
    enabled: !!spaceId && !!organizationId,
  });

  return null;
}
