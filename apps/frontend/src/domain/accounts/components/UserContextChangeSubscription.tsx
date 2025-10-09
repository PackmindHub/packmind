import { useCallback } from 'react';
import { queryClient } from '../../../shared/data/queryClient';
import { useSSESubscription } from '../../sse';
import { GET_ME_KEY, GET_USER_ORGANIZATIONS_KEY } from '../api/queryKeys';

export function UserContextChangeSubscription(): null {
  const handleUserContextChange = useCallback((event: MessageEvent) => {
    if (event.type && event.type !== 'USER_CONTEXT_CHANGE') {
      return;
    }

    try {
      JSON.parse(event.data);
      void queryClient.invalidateQueries({ queryKey: GET_ME_KEY });
      void queryClient.invalidateQueries({
        queryKey: GET_USER_ORGANIZATIONS_KEY,
      });
    } catch (error) {
      console.error('SSE: Failed to process user context change event', {
        error,
        raw: event.data,
      });
    }
  }, []);

  useSSESubscription({
    eventType: 'USER_CONTEXT_CHANGE',
    params: [],
    onEvent: handleUserContextChange,
    enabled: true,
  });

  return null;
}
