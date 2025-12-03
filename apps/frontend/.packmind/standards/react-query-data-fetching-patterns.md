# React Query Data Fetching Patterns

When building React applications with TanStack Query (React Query), establish consistent patterns for defining queries, mutations, and cache management to ensure predictable data fetching behavior, proper cache invalidation, and maintainable API layer code. This standard applies to all data fetching logic in React applications using TanStack Query. It ensures type-safe queries, proper query key management, consistent mutation patterns with cache invalidation, and separation of query options from hooks for reusability in loaders and components.

2

## Rules

* Define query keys as exported constants with descriptive UPPER_SNAKE_CASE names at the top of query files
* Create query options factory functions that return queryKey, queryFn, and enabled properties for reuse in both hooks and loaders
* Export custom hooks that wrap useQuery with the query options factory function
* Include enabled property in query options when the query depends on dynamic parameters that might be undefined
* Use useQueryClient hook to access the query client instance in mutation callbacks
* Define mutation keys as constants with descriptive UPPER_SNAKE_CASE names for each mutation
* Implement onSuccess callbacks in mutations to invalidate related query keys using queryClient.invalidateQueries
* Invalidate all affected query keys after successful mutations to ensure data consistency across the UI
* Include mutationKey property in useMutation configuration for better debugging and DevTools support
* Implement onError callbacks in mutations to log errors with relevant context including error, variables, and context parameters
