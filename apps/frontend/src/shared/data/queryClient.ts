import { QueryClient } from '@tanstack/react-query';
import { shouldRetryTransient } from './retryPolicy';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Transient failures only, which is what the policy beside this file was
      // written for and had no caller.
      //
      // Retrying a 4xx is not merely wasted: query-core gates every retry on
      // `focusManager.isFocused()` and, when that gate is closed, parks the
      // attempt in a promise with no timeout. A route clientLoader awaiting
      // `fetchQuery` in a tab nobody is looking at then never settles, so the
      // app stays on the hydrate fallback, `Loading Packmind...`, with no error
      // anywhere and nothing in the network panel but the first request. A
      // skill slug belonging to another space, whose API answers 404, reached
      // that state every time.
      //
      // A 5xx or a network error still parks in a hidden tab, and resumes when
      // the reader looks at it. That one is worth waiting for; a 404 never was.
      retry: shouldRetryTransient,
      staleTime: 1000 * 60 * 10, // 10 minutes - increased for better caching
      gcTime: 1000 * 60 * 15, // 15 minutes - keep unused data in cache longer
      refetchOnWindowFocus: false,
    },
    // No mutation retry (TanStack's own default is 0). Retrying a mutation
    // re-sends a write the server may already have applied: a failed marketplace
    // publish fired POST /publish twice, a second apart, including on 4xx that
    // can never succeed on a second attempt.
    //
    // The retry also strands the caller. query-core gates a retry on
    // `focusManager.isFocused() && onlineManager.isOnline()`, and when that gate
    // is closed it parks the attempt with no timeout — so in a hidden or offline
    // tab `mutateAsync` never settles, and any UI awaiting it keeps spinning
    // with no error surfaced.
    //
    // The auth mutations already opted out one by one; this makes it the default.
    // Anything genuinely worth retrying should opt in per-mutation, and must
    // itself be idempotent.
  },
});
