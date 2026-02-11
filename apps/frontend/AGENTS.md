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

- Build: `nx build frontend`
- Test: `nx test frontend`
- Dev server: `nx dev frontend` *(for isolated testing only; use `docker compose up` for regular local development)*
- Type check: `nx typecheck frontend`
- Lint: `nx lint frontend`

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

## Standard: Frontend testing

Enforce behavioral tests for components in files matching **/*.test.tsx using Jest and React Testing Library to assert functionality (e.g., that a button triggers the expected action) rather than mere presence, improving test reliability and preventing regressions. :
* Do not write test checking if a button is there, check that it actually works as expected

Full standard is available here for further request: [Frontend testing](.packmind/standards/frontend-testing.md)

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

Full standard is available here for further request: [Frontend Data Flow](.packmind/standards/frontend-data-flow.md)

## Standard: Frontend Navigation with React Router

Standardize frontend navigation using React Router v7 with centralized utilities in React applications to ensure consistent URL parameter handling and simplify navigation management, particularly when organizing and scoping URLs, across apps/frontend/**/*.tsx. :
* Omit orgSlug and spaceSlug parameters to use current organization and space context by default and only specify them explicitly when navigating to a different organization or space.
* Use authentication route methods (routes.auth.*) for authentication-related navigation.
* Use organization-scoped route methods (routes.org.*) for pages that require only organization context.
* Use space-scoped route methods (routes.space.*) for pages that require both organization and space context.
* Use the routes utility from shared/utils/routes for all declarative navigation with Link and NavLink components.
* Use the useNavigation() hook from shared/hooks/useNavigation for all programmatic navigation with navigate().

Full standard is available here for further request: [Frontend Navigation with React Router](.packmind/standards/frontend-navigation-with-react-router.md)

## Standard: Frontend Error Management

Establish frontend error management for apps/frontend/**/*.tsx that prescribes when to add React error boundaries beyond the global root.tsx fallback and how to handle errors they don't catch—such as event handlers, async code, SSR, or errors thrown in the boundary—by using TypeScript-typed guards (e.g., isPackmindError), try/catch for async operations, TanStack Query onError callbacks and mutation-pending checks to prevent double submissions, inline validation for expected API/user errors, and selective page- or component-level boundaries for isolated third-party widgets like CodeMirror, to reduce complexity, improve UX, and keep error flows maintainable in React/TypeScript projects built with Node.js and typical tooling (Vite/Webpack, ESLint/Prettier) and tested with Jest/Cypress. :
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

## Standard: Frontend Routing and Bundling

Configure frontend routing and bundling to ensure React Router v7 routes are correctly grouped and bundled via Vite's rollupOptions.output.manualChunks in apps/frontend/vite.config.ts using id.includes() path matching to emit named chunks (routes-public-auth, routes-org-analytics, routes-org-settings, routes-org-artifacts) for public auth, org analytics/deployments/account settings, org settings, and artifacts to optimize code splitting, minimize bundle sizes, and improve loading performance in TypeScript React applications. :
* Configure manual chunks in Vite's rollupOptions.output.manualChunks to group related routes into shared bundles for optimal code splitting
* Group organization analytics, deployments, and account settings routes into a routes-org-analytics chunk
* Group organization artifacts (dashboard, recipes, and standards routes) into a routes-org-artifacts chunk
* Group organization settings routes (app/routes/org.$orgSlug._protected.settings) into a routes-org-settings chunk
* Group public authentication routes (app/routes/_public) into a routes-public-auth chunk
* Use path matching with id.includes() to identify route files for chunk grouping in the manual chunks function

Full standard is available here for further request: [Frontend Routing and Bundling](.packmind/standards/frontend-routing-and-bundling.md)

## Standard: Jest Test Suite Organization and Patterns

Establish Jest test suite organization and patterns governing test file structure, describe/it hierarchy, typed mocking using jest.Mocked<ServiceType> and createMockInstance, factory-based test data and @packmind/types createUserId/createOrganizationId/createStandardId helpers, assertion conventions (single primary assertion, .not.toHaveBeenCalled()), test ordering (happy path, error cases, edge cases, complex scenarios), and validation/error-handling patterns for TypeScript/Node.js monorepo code (including Express or frontend React/Vue components where applicable) and toolchains (ESLint, Prettier, Webpack/Vite) with CI/infrastructure considerations (Docker, Kubernetes, AWS) to ensure reliable, maintainable, and debuggable unit and integration tests when writing or refactoring test suites with Jest. :
* Define reusable test data at the describe block level before test cases when the data is shared across multiple tests
* Group related complex scenarios in dedicated describe blocks (e.g., 'rate limiting', 'multiple organizations') with multiple test cases covering different aspects
* Order tests within each describe block: happy path first, then error cases, then edge cases (null/undefined/empty/whitespace), then complex scenarios
* Organize describe blocks using 'with...' prefix for input/state conditions and 'when...' prefix for action-based scenarios
* Test all validation edge cases systematically in separate describe blocks: empty string, whitespace-only, null, undefined, and minimal valid input
* Use .not.toHaveBeenCalled() to verify services were not invoked in error or validation failure scenarios
* Use `createXXXId` functions from @packmind/types (createUserId, createOrganizationId, createStandardId, createRecipeId) for creating typed IDs in test data
* Use createMockInstance to create mock instances
* Use typed mocks with 'jest.Mocked<ServiceType>' and initialize them in beforeEach using the pattern '{ methodName: jest.fn() } as unknown as jest.Mocked<ServiceType>'

Full standard is available here for further request: [Jest Test Suite Organization and Patterns](.packmind/standards/jest-test-suite-organization-and-patterns.md)

## Standard: TanStack Query Key Management

Manage TanStack Query key structures using hierarchical prefix matching and dedicated queryKeys.ts files in React applications to ensure efficient cache invalidation and type-safe query management when handling cross-domain data operations. :
* Define base query key arrays as const to enable precise invalidation patterns and avoid duplication
* Define domain query scope as a separate const outside enum to maintain clear separation between scope and operations
* Define query keys in a dedicated queryKeys.ts file in the domain's api folder for centralized management
* Follow hierarchical query key structure: organization scope, domain scope, operation, then identifiers for consistent invalidation patterns
* Limit cross-domain imports to only query key constants and enums to prevent runtime coupling and circular dependencies
* Use query invalidation with prefix matching from key start in correct hierarchical order

Full standard is available here for further request: [TanStack Query Key Management](.packmind/standards/tanstack-query-key-management.md)
<!-- end: Packmind standards -->
