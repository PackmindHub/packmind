import { useCallback, useMemo } from 'react';
import { queryClient } from '../../../shared/data/queryClient';
import { useSSESubscription } from '../../sse';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { CHANGE_PROPOSALS_QUERY_SCOPE } from '../api/queryKeys';
import { GET_CHANGE_PROPOSALS_KEY } from '../../recipes/api/queryKeys';
import { useCurrentSpace } from '../../spaces/hooks/useCurrentSpace';

export function ChangeProposalUpdateSubscription(): null {
  const { spaceId } = useCurrentSpace();

  const handleChangeProposalUpdate = useCallback((event: MessageEvent) => {
    if (event.type && event.type !== 'CHANGE_PROPOSAL_UPDATE') {
      return;
    }

    Promise.all([
      queryClient.invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, CHANGE_PROPOSALS_QUERY_SCOPE],
      }),
      queryClient.invalidateQueries({
        queryKey: GET_CHANGE_PROPOSALS_KEY,
      }),
    ]).catch((error) => {
      console.error('SSE: Failed to process change proposal update event', {
        error,
        raw: event.data,
      });
    });
  }, []);

  const params = useMemo(() => (spaceId ? [spaceId] : []), [spaceId]);

  useSSESubscription({
    eventType: 'CHANGE_PROPOSAL_UPDATE',
    params,
    onEvent: handleChangeProposalUpdate,
    enabled: !!spaceId,
  });

  return null;
}
