# Frontend Application

React Router v8 SPA for Packmind.

## Owned elsewhere

- **Route data flow** — how routes fetch, where query options and hooks live, gateway typing:
  `apps/frontend/.claude/rules/packmind/standard-frontend-data-flow.md`. It is `alwaysApply: true`, so
  its rules are already in context; do not look for them here.
- **Query keys**, **navigation** (the `routes` utility and `useNavigation()`), and **error handling**:
  the other three standards in `apps/frontend/.claude/rules/packmind/`.

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
  `VITE_SENTRY_ENVIRONMENT`, `VITE_CRISP_WEBSITE_ID`, `VITE_HMR_HOST`
- **API base URL**: not configurable — `packmindApiService` is hardcoded to the relative path `/api`
  (`src/services/api/PackmindApiService.ts`). In dev, `vite.config.ts` proxies `/api` to
  `API_HOSTNAME`:`API_PORT` **only when both are set**; otherwise requests go to the frontend's own
  origin.
- **Build output**: `apps/frontend/build/client/` — `react-router build` owns the location, not
  `vite.config.ts`'s `build.outDir`. It is what `project.json` declares as the target's output and
  what `dockerfile/Dockerfile.frontend` copies into nginx's document root. A `build/server/` is also
  emitted; `ssr: false` means it exists only to prerender `index.html`, and it is not deployed.
