# Frontend Data Flow

This standard defines the recommended data flow pattern for frontend routes in the Packmind codebase using React Router v7 in framework mode with TanStack Query for data management. It ensures consistent data fetching, loading patterns, and route organization across the application by centralizing data fetching logic in route loaders and ensuring data availability before rendering, which reduces intermediate loading states and promotes reusability of query options.

## Rules

* Store domain queries in the domain folder organized by entity at apps/frontend/src/domains/{entity}/api/queries/ to maintain clear separation of concerns and domain boundaries
* Export query options as standalone functions (e.g., getStandardByIdOptions) separate from hooks to enable reuse in both hooks and route loaders
* Export query hooks (e.g., useGetStandardByIdQuery) alongside query options to provide consistent component-level data access patterns
* Use clientLoader function (not loader) in route modules for data fetching when using React Router in SPA mode to ensure proper client-side data loading
* Use queryClient.ensureQueryData() or queryClient.fetchQuery() in clientLoader to preload data before rendering and leverage TanStack Query's caching mechanisms
* Consume data in route module components using the useLoaderData() hook to access data returned by the clientLoader
* Access data via query or mutation hooks in frontend route modules rather than calling gateways directly to maintain separation between data access and presentation layers
* Define a crumb property in the handle export of route modules to enable automatic navigation breadcrumb generation
* Name route module default export functions with a suffix of RouteModule (e.g., StandardDetailRouteModule) to clearly identify route-level components
* Enable query options conditionally using the enabled property to prevent execution when required parameters are missing or invalid
* Use Gateway<IUseCase> type helper for authenticated operations or PublicGateway<IPublicUseCase> for public operations in frontend gateway interfaces to ensure proper command/response typing
* Prefer `queryClient.ensureQueryData()` over `queryClient.fetchQuery()` in clientLoaders to return cached data when available instead of always fetching
