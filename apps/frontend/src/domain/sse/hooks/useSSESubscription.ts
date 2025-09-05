import { useEffect, useCallback, useRef } from 'react';
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
  const { subscribe, unsubscribe, addEventListener, removeEventListener } =
    useSSEContext();
  const eventHandlerRef = useRef(onEvent);

  // Keep handler reference up to date
  eventHandlerRef.current = onEvent;

  // Wrapped event handler to ensure we always use the latest version
  const wrappedHandler = useCallback((event: MessageEvent) => {
    eventHandlerRef.current(event);
  }, []);

  const subscribeToEvent = useCallback(async () => {
    try {
      // Subscribe to the event via API
      await subscribe(eventType, params);

      // Add event listener for this specific event type
      addEventListener(eventType, wrappedHandler);

      console.log('SSE: Subscribed to event', { eventType, params });
    } catch (error) {
      console.error('SSE: Failed to subscribe to event', {
        eventType,
        params,
        error,
      });
      throw error;
    }
  }, [eventType, params, subscribe, addEventListener, wrappedHandler]);

  const unsubscribeFromEvent = useCallback(async () => {
    try {
      // Remove event listener first
      removeEventListener(eventType, wrappedHandler);

      // Unsubscribe from the event via API
      await unsubscribe(eventType, params);

      console.log('SSE: Unsubscribed from event', { eventType, params });
    } catch (error) {
      console.error('SSE: Failed to unsubscribe from event', {
        eventType,
        params,
        error,
      });
      throw error;
    }
  }, [eventType, params, unsubscribe, removeEventListener, wrappedHandler]);

  // Auto-subscribe/unsubscribe based on enabled flag
  useEffect(() => {
    if (enabled) {
      subscribeToEvent().catch((error) => {
        console.error('SSE: Auto-subscription failed', error);
      });
    }

    // Cleanup on unmount or when enabled changes
    return () => {
      unsubscribeFromEvent().catch((error) => {
        console.error('SSE: Cleanup unsubscription failed', error);
      });
    };
  }, [enabled, subscribeToEvent, unsubscribeFromEvent]);

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
