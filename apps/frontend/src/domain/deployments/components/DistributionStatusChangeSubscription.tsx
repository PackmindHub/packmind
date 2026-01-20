import { useCallback, useMemo } from 'react';
import { queryClient } from '../../../shared/data/queryClient';
import { useSSESubscription } from '../../sse';
import { DEPLOYMENTS_QUERY_SCOPE } from '../api/queryKeys';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { useAuthContext } from '../../accounts/hooks';

export function DistributionStatusChangeSubscription(): null {
  const { organization } = useAuthContext();
  const organizationId = organization?.id;

  const handleDistributionStatusChange = useCallback((event: MessageEvent) => {
    if (event.type && event.type !== 'DISTRIBUTION_STATUS_CHANGE') {
      return;
    }

    queryClient
      .invalidateQueries({
        queryKey: [ORGANIZATION_QUERY_SCOPE, DEPLOYMENTS_QUERY_SCOPE],
      })
      .catch((error) => {
        console.error(
          'SSE: Failed to process distribution status change event',
          {
            error,
            raw: event.data,
          },
        );
      });
  }, []);

  // Memoize params to avoid unnecessary re-subscriptions
  const params = useMemo(
    () => (organizationId ? [organizationId] : []),
    [organizationId],
  );

  useSSESubscription({
    eventType: 'DISTRIBUTION_STATUS_CHANGE',
    params,
    onEvent: handleDistributionStatusChange,
    enabled: !!organizationId,
  });

  return null;
}
