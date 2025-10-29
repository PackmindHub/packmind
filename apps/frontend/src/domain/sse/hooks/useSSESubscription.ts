import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSSEContext } from '../../../services/sse';

interface UseSSESubscriptionOptions {
  /**
   * Event type to subscribe to (e.g., 'PROGRAM_STATUS_CHANGE')
   */
  eventType: string;

  /**
   * Parameters for the subscription (e.g., ['programId'])
   */
  params?: string[];

  /**
   * Optional list of parameter sets to subscribe to for the same event type.
   * When provided, `params` is ignored and subscriptions are created for each entry.
   */
  paramsList?: string[][];

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
 *   eventType: 'PROGRAM_STATUS_CHANGE',
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
  paramsList,
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

  const serializedParams = useMemo(() => {
    const normalized = Array.isArray(params)
      ? params.map((param) =>
          typeof param === 'string' ? param : String(param ?? ''),
        )
      : [];
    return JSON.stringify(normalized);
  }, [params]);

  const normalizedParams = useMemo<string[]>(() => {
    return JSON.parse(serializedParams) as string[];
  }, [serializedParams]);

  const serializedParamsList = useMemo(() => {
    if (!paramsList || paramsList.length === 0) {
      return null;
    }

    const normalizedGroups: string[][] = [];
    const seenKeys = new Set<string>();

    for (const group of paramsList) {
      if (!Array.isArray(group)) {
        continue;
      }

      const normalizedGroup = group
        .map((param) =>
          typeof param === 'string' ? param : String(param ?? ''),
        )
        .filter((param) => param.length > 0);

      if (!normalizedGroup.length) {
        continue;
      }

      const key = normalizedGroup.join('::').toUpperCase();
      if (seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);
      normalizedGroups.push(normalizedGroup);
    }

    normalizedGroups.sort((first, second) =>
      first.join(':').localeCompare(second.join(':'), undefined, {
        sensitivity: 'base',
      }),
    );

    return JSON.stringify(normalizedGroups);
  }, [paramsList]);

  const normalizedParamsList = useMemo<string[][]>(() => {
    if (serializedParamsList === null) {
      return [normalizedParams];
    }

    return JSON.parse(serializedParamsList) as string[][];
  }, [normalizedParams, serializedParamsList]);

  // Wrapped event handler to ensure we always use the latest version
  const wrappedHandler = useCallback((event: MessageEvent) => {
    eventHandlerRef.current(event);
  }, []);

  const subscribeToEvent = useCallback(async () => {
    if (!normalizedParamsList.length) {
      return;
    }

    try {
      await Promise.all(
        normalizedParamsList.map((paramGroup) =>
          subscribe(eventType, paramGroup),
        ),
      );
    } catch (error) {
      console.error('SSE: Failed to subscribe to event', {
        eventType,
        params: normalizedParamsList,
        error,
      });
      throw error;
    }
  }, [eventType, normalizedParamsList, subscribe]);

  const unsubscribeFromEvent = useCallback(async () => {
    if (!normalizedParamsList.length) {
      return;
    }

    try {
      await Promise.all(
        normalizedParamsList.map((paramGroup) =>
          unsubscribe(eventType, paramGroup),
        ),
      );
    } catch (error) {
      console.error('SSE: Failed to unsubscribe from event', {
        eventType,
        params: normalizedParamsList,
        error,
      });
      throw error;
    }
  }, [eventType, normalizedParamsList, unsubscribe]);

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
    if (!enabled || !isConnected || !normalizedParamsList.length) {
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
            params: normalizedParamsList,
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
              params: normalizedParamsList,
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
    normalizedParamsList,
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
