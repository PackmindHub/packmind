
<!-- start: Packmind recipes -->
# Packmind Recipes

🚨 **MANDATORY STEP** 🚨

Before writing, editing, or generating ANY code:

**ALWAYS READ**: the available recipes below to see what recipes are available

## Recipe Usage Rules:
- **MANDATORY**: Always check the recipes list first
- **CONDITIONAL**: Only read/use individual recipes if they are relevant to your task
- **OPTIONAL**: If no recipes are relevant, proceed without using any

## Recipe Usage Tracking:
When you DO use or apply a relevant Packmind recipe from .packmind/recipes/, you MUST call the 'packmind_notify_recipe_usage' MCP tool with:
* Recipe slugs array (e.g., ["recipe-name"] from "recipe-name.md")
* aiAgent: "Claude Code"
* gitRepo: "repository"
* target: "/"

**Remember: Always check the recipes list first, but only use recipes that actually apply to your specific task.**`

## Available recipes

* [Create End-User Documentation for Packmind Features](.packmind/recipes/create-end-user-documentation-for-packmind-features.md): Create clear and concise end-user documentation for Packmind features to empower users in accomplishing their tasks effectively while avoiding unnecessary technical details.
* [Create Organization-Scoped Pages in React Router](.packmind/recipes/create-organization-scoped-pages-in-react-router.md): Create organization-scoped pages in a React Router application to enhance navigation and user experience by ensuring secure access to relevant data for each organization.
* [Create Slot Components for Chakra UI](.packmind/recipes/create-slot-components-for-chakra-ui.md): Create slot components to wrap Chakra UI primitives for enhanced custom composition and API consistency in your design system.
<!-- end: Packmind recipes -->
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

Define a React Router v7 framework-mode data flow using clientLoader with TanStack Query (queryClient.ensureQueryData/fetchQuery, domain-organized query options and hooks, and useLoaderData) to centralize route-level data fetching, reduce intermediate loading states, and promote reusable, well-typed gateway access patterns. :
* Access data via query or mutation hooks in frontend route modules rather than calling gateways directly to maintain separation between data access and presentation layers
* Consume data in route module components using the useLoaderData() hook to access data returned by the clientLoader
* Define a crumb property in the handle export of route modules to enable automatic navigation breadcrumb generation
* Enable query options conditionally using the enabled property to prevent execution when required parameters are missing or invalid
* Export query hooks (e.g., useGetStandardByIdQuery) alongside query options to provide consistent component-level data access patterns
* Export query options as standalone functions (e.g., getStandardByIdOptions) separate from hooks to enable reuse in both hooks and route loaders
* Name route module default export functions with a suffix of RouteModule (e.g., StandardDetailRouteModule) to clearly identify route-level components
* Store domain queries in the domain folder organized by entity at apps/frontend/src/domains/{entity}/api/queries/ to maintain clear separation of concerns and domain boundaries
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

## Standard: Chakra UI v3 Component Composition and Styling

Establish consistent Chakra UI v3 usage patterns for component composition, styling, theming, and layout structure in Next.js React applications :
* Compose UI components using Chakra primitives (`Box`, `Text`, `Flex`, `Stack`) with style props (`bg`, `p`, `borderRadius`, `_hover`) instead of inline style objects or CSS classes
* Define color palettes in centralized theme constant files (e.g., `theme/colors.ts`) using semantic naming (`text.primary`, `bg.white`, `border.default`) based on purpose rather than specific color values
* Structure pages using `PageLayout` wrapper with standardized padding (`padding={12}`) and max-width (`maxWidth="breakpoint-xl"`), paired with `PageHeader` component for title, description, and toolbar props
* Use Chakra compound components (`Drawer`, `Tooltip`, `Modal`) with proper namespace destructuring (`ChakraTooltip.Root`, `ChakraTooltip.Trigger`) and context-aware rendering via `Drawer.Context` for dynamic state access
* Wrap Next.js `Link` with Chakra `Link` using `asChild` prop (`<ChakraLink asChild>`) to enable client-side navigation while maintaining Chakra styling capabilities and hover states

Full standard is available here for further request: [Chakra UI v3 Component Composition and Styling](.packmind/standards/chakra-ui-v3-component-composition-and-styling.md)

## Standard: React Components with Chakra UI Design System

Build React components using Chakra UI primitives and theme tokens with PM-prefixed wrappers that extend ChakraProvider for consistent accessible maintainable UI patterns in TypeScript React applications :
* Define all colors spacing typography in theme tokens using defineConfig from Chakra UI reference tokens with curly brace syntax like colors.background.primary never use hex codes pixel values or inline styles
* Export custom PM components from a central index file to enforce consistent imports across the application and prevent direct Chakra UI imports in feature code
* Use React forwardRef when wrapping Chakra primitives to support ref forwarding destructure Chakra component namespaces like Root Content Title and compose with other PM components for consistency
* Wrap application root with ChakraProvider configured with custom theme system value from defineConfig to ensure all components inherit design tokens and ARIA support
* Wrap Chakra UI primitives like Button Box Text in custom PM-prefixed components that extend their prop interfaces to inherit aria attributes event handlers and style props never create raw HTML elements with inline styles

Full standard is available here for further request: [React Components with Chakra UI Design System](.packmind/standards/react-components-with-chakra-ui-design-system.md)

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

Full standard is available here for further request: [React Query Data Fetching Patterns](.packmind/standards/react-query-data-fetching-patterns.md)

## Standard: React Router Organization-Scoped Routing

Establish consistent organization-scoped routing patterns in React Router applications with proper authentication, URL validation, and navigation patterns. :
* Extract orgSlug from route params using useParams() hook
* Implement authentication checks using useAuthContext before rendering content
* Implement the handle.crumb pattern for dynamic breadcrumb generation in nested routes
* Pass React Router's Link component to PMPage via LinkComponent prop for client-side navigation
* Redirect unauthenticated users to /org/${orgSlug}/sign-in or /get-started
* Redirect users to their correct organization URL when slug mismatch is detected using navigate with replace: true
* Return null during loading states or when authentication/organization validation is pending
* Use PMPage component with organization-aware breadcrumbs that include organization name and slug
* Use the file naming convention org.$orgSlug._protected.{feature}._index.tsx for all organization-scoped routes
* Validate that the URL orgSlug matches the authenticated user's organization slug

Full standard is available here for further request: [React Router Organization-Scoped Routing](.packmind/standards/react-router-organization-scoped-routing.md)

## Standard: Structured Logging with PackmindLogger and Datadog

Enforce structured logging with PackmindLogger and Datadog across Node.js/TypeScript services by creating named PackmindLogger instances with service name and LogLevel enum (default INFO) that emit structured JSON to Datadog from constructors and lifecycle initialization using logger.info/debug and logger.error with sanitized contextual metadata (organizationId, userId, recipeId, standardId, entity IDs) while never logging passwords, tokens, API keys, PII or full request payloads, avoiding console.log, using PackmindErrorHandler.throwError and error instanceof Error checks to convert errors to messages, and choosing error/warn/info/debug levels appropriately to enable reliable debugging, monitoring, observability and security compliance in development and production. :
* Create PackmindLogger instances with service name and LogLevel in constructor log info for successful operations error for failures with structured metadata including IDs and error messages never use console.log
* Define origin constant for logger name inject PackmindLogger with default LogLevel.INFO in constructor log initialization lifecycle events with info and debug use try-catch to log initialization errors before throwing
* Log metadata with userId organizationId recipeId standardId and sanitized error messages never log passwords tokens API keys PII or full request payloads to prevent sensitive data exposure
* Use error for failures requiring investigation warn for unexpected but recoverable issues info for significant business events and debug for detailed diagnostic information choose appropriate level based on production relevance
* Use logger.info for operation start and success logger.error with full error context before rethrowing errors include entity IDs operation context and convert error to message using error instanceof Error check
* Use PackmindErrorHandler.throwError instead of this.handleError(error);

Full standard is available here for further request: [Structured Logging with PackmindLogger and Datadog](.packmind/standards/structured-logging-with-packmindlogger-and-datadog.md)
<!-- end: Packmind standards -->