import {
  useEffect,
  useRef,
  ReactNode,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { getEnvVar } from '../../shared/utils/getEnvVar';
import { useAuthContext } from '../../domain/accounts/hooks/useAuthContext';

interface SSEContextValue {
  subscribe: (eventType: string, params?: string[]) => Promise<void>;
  unsubscribe: (eventType: string, params?: string[]) => Promise<void>;
  addEventListener: (
    eventType: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  removeEventListener: (
    eventType: string,
    handler: (event: MessageEvent) => void,
  ) => void;
  isConnected: boolean;
}

const SSEContext = createContext<SSEContextValue | null>(null);

export const useSSEContext = (): SSEContextValue => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  return context;
};

interface SSEProviderProps {
  children: ReactNode;
}

/**
 * Enhanced SSE Provider with subscription management
 * Connects to the SSE stream when user is authenticated
 * Provides subscription management capabilities to child components
 */
export function SSEProvider({ children }: SSEProviderProps) {
  const { isAuthenticated, isLoading } = useAuthContext();
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventListenersRef = useRef<
    Map<string, Set<(event: MessageEvent) => void>>
  >(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // API functions for subscription management
  const subscribeToEvent = useCallback(
    async (eventType: string, params: string[] = []): Promise<void> => {
      const baseUrl = getEnvVar('VITE_PACKMIND_API_BASE_URL');
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const response = await fetch(`${apiUrl}/v0/sse/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ eventType, params }),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to subscribe to ${eventType}: ${response.statusText}`,
        );
      }
    },
    [],
  );

  const unsubscribeFromEvent = useCallback(
    async (eventType: string, params: string[] = []): Promise<void> => {
      const baseUrl = getEnvVar('VITE_PACKMIND_API_BASE_URL');
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const response = await fetch(`${apiUrl}/v0/sse/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ eventType, params }),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to unsubscribe from ${eventType}: ${response.statusText}`,
        );
      }
    },
    [],
  );

  // Event listener management
  const addSSEEventListener = useCallback(
    (eventType: string, handler: (event: MessageEvent) => void): void => {
      if (!eventListenersRef.current.has(eventType)) {
        eventListenersRef.current.set(eventType, new Set());
      }
      const handlers = eventListenersRef.current.get(eventType);
      if (handlers) {
        handlers.add(handler);
      }

      // Add to actual EventSource if connection exists
      if (eventSourceRef.current) {
        eventSourceRef.current.addEventListener(eventType, handler);
      }
    },
    [],
  );

  const removeSSEEventListener = useCallback(
    (eventType: string, handler: (event: MessageEvent) => void): void => {
      const handlers = eventListenersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventListenersRef.current.delete(eventType);
        }
      }

      // Remove from actual EventSource if connection exists
      if (eventSourceRef.current) {
        eventSourceRef.current.removeEventListener(eventType, handler);
      }
    },
    [],
  );

  useEffect(() => {
    // Always close any existing connection before establishing a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);

    // Don't connect if still loading or not authenticated
    if (isLoading || !isAuthenticated) {
      return;
    }

    const baseUrl = getEnvVar('VITE_PACKMIND_API_BASE_URL');
    const sseUrl = baseUrl.endsWith('/api')
      ? `${baseUrl}/v0/sse/stream`
      : `${baseUrl}/api/v0/sse/stream`;

    const eventSource = new EventSource(sseUrl, {
      withCredentials: true, // Include cookies for authentication
    });

    // Store reference for cleanup
    eventSourceRef.current = eventSource;
    setIsConnected(eventSource.readyState === EventSource.OPEN);

    eventSource.addEventListener('open', () => {
      setIsConnected(true);
    });
    eventSource.addEventListener('error', () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setIsConnected(false);
      }
    });

    // Re-attach all stored event listeners
    for (const [eventType, handlers] of eventListenersRef.current.entries()) {
      for (const handler of handlers) {
        eventSource.addEventListener(eventType, handler);
      }
    }

    // Clean up on unmount or when authentication changes
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, isLoading]);

  const contextValue: SSEContextValue = useMemo(
    () => ({
      subscribe: subscribeToEvent,
      unsubscribe: unsubscribeFromEvent,
      addEventListener: addSSEEventListener,
      removeEventListener: removeSSEEventListener,
      isConnected,
    }),
    [
      subscribeToEvent,
      unsubscribeFromEvent,
      addSSEEventListener,
      removeSSEEventListener,
      isConnected,
    ],
  );

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
}
