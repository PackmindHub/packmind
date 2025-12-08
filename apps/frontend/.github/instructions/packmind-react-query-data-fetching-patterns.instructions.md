---
applyTo: '**'
---
## Standard: React Query Data Fetching Patterns

Standardize React Query (TanStack Query) keys, options factories, and mutation patterns with cache invalidation and typed query definitions to ensure predictable data fetching, consistent cache behavior, and a maintainable API layer. :
* Create query options factory functions that return queryKey, queryFn, and enabled properties for reuse in both hooks and loaders
* Define mutation keys as constants with descriptive UPPER_SNAKE_CASE names for each mutation
* Define query keys as exported constants with descriptive UPPER_SNAKE_CASE names at the top of query files
* Export custom hooks that wrap useQuery with the query options factory function
* Implement onError callbacks in mutations to log errors with relevant context including error, variables, and context parameters
* Implement onSuccess callbacks in mutations to invalidate related query keys using queryClient.invalidateQueries
* Include enabled property in query options when the query depends on dynamic parameters that might be undefined
* Include mutationKey property in useMutation configuration for better debugging and DevTools support
* Invalidate all affected query keys after successful mutations to ensure data consistency across the UI
* Use useQueryClient hook to access the query client instance in mutation callbacks

Full standard is available here for further request: [React Query Data Fetching Patterns](../../.packmind/standards/react-query-data-fetching-patterns.md)