import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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
