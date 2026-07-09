# Frontend Application

React Router v7 single-page application for Packmind, built with Chakra UI and TanStack Query.

## Architecture

- **Framework**: React Router v7 with file-based routing
- **UI Library**: Chakra UI v3 with custom PM-prefixed components
- **State Management**: TanStack Query v5 for server state, React Context for UI state
- **Data Fetching**: clientLoader functions with TanStack Query integration
- **Styling**: Chakra UI theming system with custom design tokens
- **Build Tool**: Vite 6 with React plugin

## Technologies

- **React**: v19 - UI components, hooks, context
- **React Router**: v7 - File-based routing, loaders, actions
- **Vite**: v6 - Fast development server and optimized builds
- **Chakra UI**: v3 - Component library with theming system
- **TanStack Query**: v5 - Server state management and caching
- **TypeScript**: Type-safe component props and API contracts
- **Axios**: HTTP client for API communication

## Main Commands

- Build: `./node_modules/.bin/nx build frontend`
- Test: `./node_modules/.bin/nx test frontend`
- Type check: `./node_modules/.bin/nx typecheck frontend`
- Lint: `./node_modules/.bin/nx lint frontend`

## Configuration

- **Port**: 4200 (default development)
- **Environment Variables**: Vite env vars with `VITE_` prefix
- **API Base URL**: Configured via environment variable
- **Build Output**: `dist/apps/frontend/`

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: Frontend Data Flow

This standard defines the recommended data flow pattern for frontend routes in the Packmind codebase using React Router v7 in framework mode with TanStack Query for data management. It ensures consist... :
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

Full standard is available here for further request: [Frontend Data Flow](.packmind/standards/frontend-data-flow.md)

# Standard: Frontend Error Management

A global error boundary is already configured at the root level (in root.tsx) that automatically catches all page crashes, 404s, and loader failures. This standard defines when and how to use explicit... :
* Avoid overusing error boundaries as they increase code complexity and make error flows harder to trace
* Display validation errors inline near the relevant form fields for better user experience
* Do NOT use error boundaries for errors that should be handled explicitly such as form validation, expected API errors, and user input errors
* Handle TanStack Query mutation errors using onError callbacks to display contextual error messages
* Only add a page-level error boundary when you need custom error UI for a specific route that differs from the default error page
* Only add component-level error boundaries for isolated critical features where partial failure is acceptable, such as independent dashboard widgets that can fail without affecting the rest of the page. Use this mainly when using components we do not manage internally (eg: CodeMirror).
* Prevent double submissions by checking mutation pending state before triggering operations
* Use typed error guards such as isPackmindError to safely extract error details from API responses before displaying to users
* Wrap async operations in try-catch blocks since error boundaries do NOT catch errors in event handlers or async code

Full standard is available here for further request: [Frontend Error Management](.packmind/standards/frontend-error-management.md)

# Standard: Frontend Navigation with React Router

This codebase uses React Router v7 with organization and space scoping in URLs (e.g., /org/{orgSlug}/space/{spaceSlug}/recipes). To maintain consistency, improve maintainability, and simplify navigati... :
* Omit orgSlug and spaceSlug parameters to use current organization and space context by default and only specify them explicitly when navigating to a different organization or space.
* Use authentication route methods (routes.auth.*) for authentication-related navigation.
* Use organization-scoped route methods (routes.org.*) for pages that require only organization context.
* Use space-scoped route methods (routes.space.*) for pages that require both organization and space context.
* Use the routes utility from shared/utils/routes for all declarative navigation with Link and NavLink components.
* Use the useNavigation() hook from shared/hooks/useNavigation for all programmatic navigation with navigate().

Full standard is available here for further request: [Frontend Navigation with React Router](.packmind/standards/frontend-navigation-with-react-router.md)

# Standard: TanStack Query Key Management

TanStack Query uses prefix matching to invalidate cached queries, matching keys from left to right like a file path. Properly structured query keys enable efficient cache invalidation at any scope lev... :
* Define base query key arrays as const to enable precise invalidation patterns and avoid duplication
* Define domain query scope as a separate const outside enum to maintain clear separation between scope and operations
* Define query keys in a dedicated queryKeys.ts file in the domain's api folder for centralized management
* Follow hierarchical query key structure: organization scope, domain scope, operation, then identifiers for consistent invalidation patterns
* In mutation onSuccess, invalidate every affected sibling query-key scope; prefix matching cannot bridge siblings
* Limit cross-domain imports to only query key constants and enums to prevent runtime coupling and circular dependencies
* Use query invalidation with prefix matching from key start in correct hierarchical order

Full standard is available here for further request: [TanStack Query Key Management](.packmind/standards/tanstack-query-key-management.md)
<!-- end: Packmind standards -->
