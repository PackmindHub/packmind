# Frontend Architecture — Data Flow, Routing & UI

## Data Flow Pattern (React Router + TanStack Query)

The frontend uses React Router v7 in SPA mode with TanStack Query for all data management. Data is preloaded in route loaders before components render.

### Route Module Structure

```
apps/frontend/src/
└── domain/{entity}/
    └── api/
        └── queries/
            └── queryKeys.ts      — query key definitions
            └── getEntityQuery.ts — query option functions + hooks
```

### Rules

- Store domain queries in `apps/frontend/src/domain/{entity}/api/queries/`
- Export query options as standalone functions (e.g., `getStandardByIdOptions`) separate from hooks — enables reuse in both hooks and loaders
- Export query hooks (e.g., `useGetStandardByIdQuery`) alongside query options
- Use `clientLoader` (NOT `loader`) in route modules — SPA mode requirement
- Use `queryClient.ensureQueryData()` (preferred) or `queryClient.fetchQuery()` in `clientLoader` — leverages cache before fetching
- Consume data in components via `useLoaderData()` hook
- Enable query options conditionally with the `enabled` property when parameters might be missing
- Name route module default exports with `RouteModule` suffix (e.g., `StandardDetailRouteModule`)
- Define `crumb` in the `handle` export of route modules for breadcrumb generation

### Gateway Pattern

- Use `Gateway<IUseCase>` for authenticated operations
- Use `PublicGateway<IPublicUseCase>` for public operations
- Components never call gateways directly — always via query/mutation hooks

---

## TanStack Query Key Management

Query keys use prefix matching for cache invalidation. Structure: `organization scope → domain scope → operation → identifiers`.

### Rules

- Define query keys in a dedicated `queryKeys.ts` file per domain api folder
- Define domain query scope as a separate `const` outside the enum
- Define base query key arrays as `const` for precise invalidation
- Cross-domain imports limited to query key constants and enums only — no runtime coupling
- Invalidate using prefix matching from the correct hierarchical position

### Example Structure

```typescript
// queryKeys.ts
export const STANDARD_SCOPE = ['standards'] as const
export enum StandardQueryKeys { List = 'list', ById = 'byId' }

export const standardQueryKeys = {
  all: (orgId: string) => [orgId, ...STANDARD_SCOPE] as const,
  list: (orgId: string) => [...standardQueryKeys.all(orgId), StandardQueryKeys.List] as const,
  byId: (orgId: string, id: string) => [...standardQueryKeys.all(orgId), StandardQueryKeys.ById, id] as const,
}
```

---

## Navigation

The app uses organization and space scoping in URLs (`/org/{orgSlug}/space/{spaceSlug}/...`).

### Rules

- Use `routes` utility from `shared/utils/routes` for all declarative navigation (`Link`, `NavLink`)
- Use `useNavigation()` from `shared/hooks/useNavigation` for all programmatic navigation
- Omit `orgSlug` and `spaceSlug` by default — they resolve to current context
- Only specify them explicitly when navigating to a different org/space
- `routes.auth.*` for authentication pages
- `routes.org.*` for org-context pages
- `routes.space.*` for pages requiring both org and space context

---

## UI & Design System

- **Never** use vanilla HTML tags (`div`, `span`, `button`, `input`) — always use `@packmind/ui` components (`PMBox`, `PMText`, `PMButton`, `PMInput`, etc.)
- Import from `@packmind/ui`, never from `@chakra-ui` directly
- Use design token `'full'` instead of `'100%'` for width/height
- Use only semantic tokens: `colorPalette`, `background.primary/secondary/tertiary`, `text.primary/secondary/tertiary`, `border.primary/secondary/tertiary` — no hardcoded color values

---

## Error Management

A global error boundary at `root.tsx` handles all page crashes, 404s, and loader failures automatically. The rules below govern when to add more error handling beyond the global boundary.

**Error boundaries do NOT catch** errors in event handlers, async code (setTimeout, Promises), SSR, or in the boundary itself.

### Rules

- Avoid overusing error boundaries — they increase complexity and make error flows harder to trace
- Do NOT use error boundaries for errors that should be handled explicitly: form validation, expected API errors, user input errors
- Only add a page-level error boundary when you need custom error UI for a specific route that differs from the default error page
- Only add component-level error boundaries for isolated critical features where partial failure is acceptable (e.g., independent dashboard widgets, third-party components like CodeMirror)
- Handle TanStack Query mutation errors using `onError` callbacks to display contextual error messages
- Wrap async operations in `try-catch` blocks — error boundaries do NOT catch async errors
- Display validation errors inline near the relevant form fields — not in a banner or toast
- Prevent double submissions by checking mutation pending state before triggering operations
- Use typed error guards such as `isPackmindError` to safely extract error details from API responses before displaying to users
