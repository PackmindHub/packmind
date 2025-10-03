import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSSEContext } from '../../../services/sse';

interface UseSSESubscriptionOptions {
  /**
   * Event type to subscribe to (e.g., 'program_status')
   */
  eventType: string;

  /**
   * Parameters for the subscription (e.g., ['programId'])
   */
  params?: string[];

  /**
   * Event handler to call when SSE event is received
   */
  onEvent: (event: MessageEvent) => void;

  /**
   * Whether to automatically subscribe when component mounts
   * @default true
   */
  enabled?: boolean;
}

/**
 * Custom hook for managing SSE subscriptions with automatic cleanup
 *
 * @example
 * ```tsx
 * const { subscribe, unsubscribe, isSubscribed } = useSSESubscription({
 *   eventType: 'program_status',
 *   params: [programId],
 *   onEvent: (event) => {
 *     const data = JSON.parse(event.data);
 *     console.log('Program status changed:', data);
 *   },
 * });
 * ```
 */
export function useSSESubscription({
  eventType,
  params = [],
  onEvent,
  enabled = true,
}: UseSSESubscriptionOptions) {
  const {
    subscribe,
    unsubscribe,
    addEventListener,
    removeEventListener,
    isConnected,
  } = useSSEContext();
  const eventHandlerRef = useRef(onEvent);

  // Keep handler reference up to date
  eventHandlerRef.current = onEvent;

  const serializedParams = useMemo(
    () => JSON.stringify(params ?? []),
    [params],
  );

  const normalizedParams = useMemo<string[]>(
    () => JSON.parse(serializedParams) as string[],
    [serializedParams],
  );

  // Wrapped event handler to ensure we always use the latest version
  const wrappedHandler = useCallback((event: MessageEvent) => {
    eventHandlerRef.current(event);
  }, []);

  const subscribeToEvent = useCallback(async () => {
    try {
      await subscribe(eventType, normalizedParams);
    } catch (error) {
      console.error('SSE: Failed to subscribe to event', {
        eventType,
        params: normalizedParams,
        error,
      });
      throw error;
    }
  }, [eventType, normalizedParams, subscribe]);

  const unsubscribeFromEvent = useCallback(async () => {
    try {
      await unsubscribe(eventType, normalizedParams);
    } catch (error) {
      console.error('SSE: Failed to unsubscribe from event', {
        eventType,
        params: normalizedParams,
        error,
      });
      throw error;
    }
  }, [eventType, normalizedParams, unsubscribe]);

  const isSubscribedRef = useRef(false);
  const pendingSubscriptionRef = useRef(false);

  // Ensure the event handler is registered for the lifetime of this hook while enabled
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    addEventListener(eventType, wrappedHandler);

    return () => {
      removeEventListener(eventType, wrappedHandler);
    };
  }, [
    enabled,
    addEventListener,
    removeEventListener,
    eventType,
    wrappedHandler,
  ]);

  // Manage server-side subscription lifecycle based on connection state
  useEffect(() => {
    if (!enabled || !isConnected) {
      return undefined;
    }

    let cancelled = false;
    pendingSubscriptionRef.current = true;

    subscribeToEvent()
      .then(() => {
        if (!cancelled) {
          isSubscribedRef.current = true;
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('SSE: Auto-subscription failed', {
            eventType,
            params: normalizedParams,
            error,
          });
        }
      })
      .finally(() => {
        pendingSubscriptionRef.current = false;
      });

    return () => {
      cancelled = true;

      if (isSubscribedRef.current || pendingSubscriptionRef.current) {
        unsubscribeFromEvent()
          .catch((error) => {
            console.error('SSE: Cleanup unsubscription failed', {
              eventType,
              params: normalizedParams,
              error,
            });
          })
          .finally(() => {
            isSubscribedRef.current = false;
            pendingSubscriptionRef.current = false;
          });
      }
    };
  }, [
    enabled,
    isConnected,
    subscribeToEvent,
    unsubscribeFromEvent,
    eventType,
    normalizedParams,
  ]);

  return {
    /**
     * Manually subscribe to the event
     */
    subscribe: subscribeToEvent,

    /**
     * Manually unsubscribe from the event
     */
    unsubscribe: unsubscribeFromEvent,
  };
}
