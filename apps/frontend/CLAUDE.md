# Frontend Application

React Router v7 single-page application for Packmind, built with Chakra UI and TanStack Query.

## Architecture

- **Framework**: React Router v7 with file-based routing
- **UI Library**: Chakra UI v3 with custom PM-prefixed components
- **State Management**: TanStack Query v5 for server state, React Context for UI state
- **Data Fetching**: clientLoader functions with TanStack Query integration
- **Styling**: Chakra UI theming system with custom design tokens
- **Build Tool**: Vite 6 with React plugin

### Routing Pattern

- File-based routing in `app/routes/` directory
- Route modules export `clientLoader` for data fetching
- Use `useLoaderData()` hook to access loaded data in components

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
- Dev server: `nx dev frontend`
- Type check: `nx typecheck frontend`
- Lint: `nx lint frontend`

## Key Patterns

### clientLoader with TanStack Query

- Route loaders use `queryClient.ensureQueryData()` or `queryClient.fetchQuery()`
- Integrate TanStack Query with React Router loaders for SSR-like data loading
- Example pattern:
  ```typescript
  export const clientLoader = (queryClient: QueryClient) => async () => {
    return queryClient.ensureQueryData(myQueryOptions);
  };
  ```

### PM-Prefixed Chakra Components

- Custom wrappers around Chakra UI primitives with `PM` prefix
- Located in `packages/ui/` or `app/components/`
- Provide consistent styling and behavior across the app
- Example: `PMButton`, `PMCard`, `PMModal`

### API Gateway Pattern

- Gateway classes in `app/gateways/` abstract API communication
- Use dependency injection pattern with React Context
- Isolate API calls from components for better testability

### Component Structure

- Page components in `app/routes/`
- Reusable UI components in `app/components/` or `packages/ui/`
- Feature-specific components colocated with routes

## Configuration

- **Port**: 4200 (default development)
- **Environment Variables**: Vite env vars with `VITE_` prefix
- **API Base URL**: Configured via environment variable
- **Build Output**: `dist/apps/frontend/`

## Testing

- Unit tests: `*.spec.tsx` files colocated with components
- Follow standards in `.claude/rules/packmind/standard-testing-good-practices.md`
- Use React Testing Library for component tests
- Mock API calls with MSW or vitest mocks

## Related Documentation

- See `.claude/rules/packmind/` for coding standards
- See `packages/ui/` for shared UI components
- See root `CLAUDE.md` for monorepo-wide rules
