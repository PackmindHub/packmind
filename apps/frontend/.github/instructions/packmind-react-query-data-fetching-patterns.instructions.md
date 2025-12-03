---
applyTo: '**'
---
## Standard: React Query Data Fetching Patterns

Establish consistent TanStack Query patterns in React by using reusable query options factories (queryKey, queryFn, enabled), custom hooks wrapping useQuery, and useMutation configured with mutationKey, onSuccess queryClient.invalidateQueries via useQueryClient, and onError contextual logging, to ensure predictable caching, type safety, and maintainable, reusable API logic for components and loaders. :
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