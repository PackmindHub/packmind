# Frontend Application

React Router v7 SPA for Packmind.

## Owned elsewhere

- **Route data flow** — how routes fetch, where query options and hooks live, gateway typing:
  `.claude/rules/packmind/standard-frontend-data-flow.md`. It is `alwaysApply: true`, so its rules are
  already in context; do not look for them here.
- **Query keys**, **navigation** (the `routes` utility and `useNavigation()`), and **error handling**:
  the other three standards in `.claude/rules/packmind/`.
- **UI components** — use `@packmind/ui` PM components, never `@chakra-ui/react` directly: the
  **`working-with-pm-design-kit`** skill.

## Stack specifics

- **React** v19, **Vite** v8, **Axios** for HTTP
- **React Context** for UI state (server state belongs to TanStack Query — see the data-flow standard)

## Commands

- Dev server: `./node_modules/.bin/nx dev frontend`
- Type check: `./node_modules/.bin/nx typecheck frontend`

(`build`, `test` and `lint` follow the generic form in the root `CLAUDE.md`.)

## Configuration

- **Port**: 4200 (set twice in `vite.config.ts` — `server` and `preview`)
- **Environment variables**: Vite vars with the `VITE_` prefix — `VITE_SENTRY_FRONTEND_DSN`,
  `VITE_SENTRY_ENVIRONMENT`, `VITE_CRISP_WEBSITE_ID`, `VITE_HMR_HOST`,
  `VITE_OTEL_EXPORTER_URL` (browser tracing; unset disables it — see `docker/otel/README.md`)
- **API base URL**: not configurable — `packmindApiService` is hardcoded to the relative path `/api`
  (`src/services/api/PackmindApiService.ts`). In dev, `vite.config.ts` proxies `/api` to
  `API_HOSTNAME`:`API_PORT` **only when both are set**; otherwise requests go to the frontend's own
  origin.
- **Build output**: `dist/apps/frontend/`
