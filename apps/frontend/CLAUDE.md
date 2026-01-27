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
