# Dashboard Performance Optimization — Design Spec

**Goal:** Reduce dashboard load time from ~10s to sub-second initial render by replacing 3 heavy deployment overview API calls with 3 lightweight purpose-built endpoints.

**Scope:**
- IN: Dashboard KPI cards, Outdated targets section, Non-live artifacts modal
- OUT: Dedicated deployment pages (keep existing overview endpoints as-is)

## Context

At scale (~150 standards, 40 commands, 50 skills), the dashboard fires 3 API calls that each:
1. Load ALL successful distributions with 6 eager-loaded relations (cartesian product)
2. Run 750+ lines of in-memory computation
3. Return full entity trees (git repos, versions, deployment metadata)

The dashboard only needs: counts (KPI), outdated items per target, and non-live artifact names on demand.

## Architecture

Three new use cases in `packages/deployments`, each behind a new endpoint on the existing deployments controller. All space-scoped.

```
packages/deployments/src/application/useCases/
├── getDashboardKpi/          → counts only, SQL aggregates
├── getDashboardOutdated/     → outdated per target, optimized query
└── getDashboardNonLive/      → non-deployed artifact names, on-demand
```

Key principle: **none of these use cases call `listByOrganizationIdWithStatus()`**. They use new targeted repository methods that fetch only what's needed.

The existing heavy overview endpoints remain untouched — deployment pages keep working as-is.

### Hexagonal wiring

Each new use case is wired through `DeploymentsAdapter` (implementing `IDeploymentPort`) and exposed via the adapter's port interface. The `DeploymentsHexa` facade instantiates them in `initialize()` and passes required ports.

### Loading strategy

| Component | Endpoint | Loading |
|-----------|----------|---------|
| DashboardKPI | `/dashboard/kpi` | Eager — above the fold |
| OutdatedTargetsSection | `/dashboard/outdated` | Lazy — below the fold |
| NonLiveArtifactsModal | `/dashboard/non-live` | On demand — when modal opens |

## Data Model

No new entities or schema changes. New response contracts only.

### New contracts (`packages/types/src/deployments/contracts/`)

Each contract follows the standard pattern: one file per use case exporting Command, Response, and IUseCase.

**`IGetDashboardKpi.ts`**:
```typescript
type GetDashboardKpiCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};
type DashboardKpiResponse = {
  standards: { total: number; active: number };
  recipes: { total: number; active: number };
  skills: { total: number; active: number };
};
type IGetDashboardKpi = IUseCase<GetDashboardKpiCommand, DashboardKpiResponse>;
```

**`IGetDashboardOutdated.ts`**:
```typescript
type GetDashboardOutdatedCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};
type DashboardOutdatedResponse = {
  targets: DashboardOutdatedTarget[];
};
type DashboardOutdatedTarget = {
  target: Target;
  gitRepo: GitRepo;
  outdatedStandards: DeployedStandardTargetInfo[];
  outdatedRecipes: DeployedRecipeTargetInfo[];
};
type IGetDashboardOutdated = IUseCase<GetDashboardOutdatedCommand, DashboardOutdatedResponse>;
```

**`IGetDashboardNonLive.ts`**:
```typescript
type GetDashboardNonLiveCommand = PackmindCommand & {
  organizationId: OrganizationId;
  spaceId: SpaceId;
};
type DashboardNonLiveResponse = {
  standards: { id: string; name: string }[];
  recipes: { id: string; name: string }[];
  skills: { id: string; name: string; slug: string }[];
};
type IGetDashboardNonLive = IUseCase<GetDashboardNonLiveCommand, DashboardNonLiveResponse>;
```

The outdated response uses only the target-centric view (no legacy `repositories` view) since the dashboard only uses that.

## Use Cases / Services

### 1. `GetDashboardKpiUseCase`

- Gets total artifact counts from `IStandardsPort`, `IRecipesPort`, `ISkillsPort` (existing `listBySpace` methods, counting `.length`). Note: loading ~240 lightweight entity objects to count them is negligible (<10ms) — the bottleneck is the distribution query, not the artifact list.
- Gets active (deployed) counts via new repo method `countActiveArtifactsBySpace(orgId, spaceId)`:
  - SQL: for each target, find the latest successful distribution → count distinct standard/recipe/skill IDs in those distributions' packages
- Returns `DashboardKpiResponse` — counts only

### 2. `GetDashboardOutdatedUseCase`

- New repo method `findOutdatedDeploymentsBySpace(orgId, spaceId)`:
  - Finds latest successful distribution per target
  - Joins to `distributed_package_standard_versions` / `distributed_package_recipe_versions` to get deployed version numbers
  - Compares deployed version number against the current latest version (from the `standard_version` / `recipe_version` tables)
  - Returns only rows where `deployedVersion.version < latestVersion.version` OR artifact is soft-deleted
- Uses standards/recipes ports to resolve artifact names for display
- Returns `DashboardOutdatedResponse` — target-centric outdated view only

### 3. `GetDashboardNonLiveUseCase`

- Gets all artifacts per space from standards/recipes/skills ports (same lightweight list as KPI — ~240 objects, negligible cost)
- Gets deployed artifact IDs via new repo method `listDeployedArtifactIdsBySpace(orgId, spaceId)` — distinct artifact IDs from latest successful distributions
- Diffs the two sets → non-live = total minus deployed
- Returns `DashboardNonLiveResponse` — lightweight `{ id, name }` objects

### New `DistributionRepository` methods

- `countActiveArtifactsBySpace(orgId, spaceId)` — SQL aggregate returning `{ standards: number, recipes: number, skills: number }`
- `findOutdatedDeploymentsBySpace(orgId, spaceId)` — targeted query with version comparison, returns lightweight DTOs (no full entity trees)
- `listDeployedArtifactIdsBySpace(orgId, spaceId)` — distinct artifact IDs from latest successful distributions

Existing `listByOrganizationIdWithStatus()` is untouched.

## API Surface

### 3 new endpoints on `deployments.controller.ts`

```
GET /organizations/:orgId/deployments/dashboard/kpi?spaceId=xxx
GET /organizations/:orgId/deployments/dashboard/outdated?spaceId=xxx
GET /organizations/:orgId/deployments/dashboard/non-live?spaceId=xxx
```

All member-authenticated, same auth pattern as existing deployment endpoints.

### Frontend changes

**DashboardKPI.tsx**: Replace 3 heavy overview queries with `useGetDashboardKpiQuery(spaceId)`.

**OutdatedTargetsSection.tsx**: Replace 2 overview queries with `useGetDashboardOutdatedQuery(spaceId)`.

**NonLiveArtifactsModal.tsx**: Replace 3 overview queries with `useGetDashboardNonLiveQuery(spaceId)` with `enabled: open` (fires only when modal opens).

**New frontend files**:
- 3 query hooks + options in `DeploymentsQueries.ts`
- 3 gateway methods in `DeploymentsGateway.ts`

## Testing Approach

- Unit tests for each of the 3 new use cases (mocked ports/repos)
- Unit tests for each new repository method
- Frontend: standard TanStack Query hook wiring

## Out of Scope

- Optimizing existing deployment overview endpoints (for deployment pages)
- True viewport-based lazy loading for OutdatedTargetsSection (endpoint separation enables this later)
- Redis caching layer (can be added on top later)
- Skills in outdated section (currently passed as `[]` in frontend)
