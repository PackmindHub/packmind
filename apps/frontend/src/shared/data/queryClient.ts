import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 10, // 10 minutes - increased for better caching
      gcTime: 1000 * 60 * 15, // 15 minutes - keep unused data in cache longer
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
