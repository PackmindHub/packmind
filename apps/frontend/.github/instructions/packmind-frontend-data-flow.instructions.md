---
applyTo: '**'
---
## Standard: Frontend Data Flow

Standardize frontend route data flow using React Router v7 framework mode with TanStack Query by centralizing fetching in route clientLoaders via queryClient.ensureQueryData(), organizing reusable query options/hooks under apps/frontend/src/domain/{entity}/api/queries/, and consuming results with useLoaderData() to reduce intermediate loading states and improve consistency and reuse. :
* Access data via query or mutation hooks in frontend route modules rather than calling gateways directly to maintain separation between data access and presentation layers
* Consume data in route module components using the useLoaderData() hook to access data returned by the clientLoader
* Define a crumb property in the handle export of route modules to enable automatic navigation breadcrumb generation
* Enable query options conditionally using the enabled property to prevent execution when required parameters are missing or invalid
* Export query hooks (e.g., useGetStandardByIdQuery) alongside query options to provide consistent component-level data access patterns
* Export query options as standalone functions (e.g., getStandardByIdOptions) separate from hooks to enable reuse in both hooks and route loaders
* Name route module default export functions with a suffix of RouteModule (e.g., StandardDetailRouteModule) to clearly identify route-level components
* Prefer `queryClient.ensureQueryData()` over `queryClient.fetchQuery()` in clientLoaders to return cached data when available instead of always fetching
* Store domain queries in the domain folder organized by entity at apps/frontend/src/domain/{entity}/api/queries/ to maintain clear separation of concerns and domain boundaries
* Use clientLoader function (not loader) in route modules for data fetching when using React Router in SPA mode to ensure proper client-side data loading
* Use Gateway<IUseCase> type helper for authenticated operations or PublicGateway<IPublicUseCase> for public operations in frontend gateway interfaces to ensure proper command/response typing
* Use queryClient.ensureQueryData() or queryClient.fetchQuery() in clientLoader to preload data before rendering and leverage TanStack Query's caching mechanisms

Full standard is available here for further request: [Frontend Data Flow](../../.packmind/standards/frontend-data-flow.md)