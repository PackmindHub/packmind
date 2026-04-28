# Per-domain `countBySpaceIds` aggregation

**Domain:** backend
**Last confirmed:** 2026-04-28

## When to use
You need to aggregate counts of artifacts (recipes, standards, skills, etc.) per space (or per any parent id) for a paginated listing. The use case must fan out across several independent domain packages and stitch results into a single response shape.

## How it works

Each participating domain exposes one method that returns `Map<ParentId, number>` (e.g. `Map<SpaceId, number>`) for a given list of parent ids. The use case calls all of them in parallel via `Promise.all`, then reads each map per row when assembling the response.

The shape is identical in every domain:

1. **Port** (in `packages/types/src/<domain>/ports/I<Domain>Port.ts`)
   ```ts
   countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;
   ```
2. **Domain repository interface** (in `packages/<domain>/src/domain/repositories/I<Domain>Repository.ts`) — same signature.
3. **Repository implementation** (in `packages/<domain>/src/infra/repositories/<Domain>Repository.ts`) — TypeORM `createQueryBuilder` with `.where('space_id IN (:...spaceIds)')`, `.groupBy('space_id')`, `.select(['space_id', 'COUNT(*) AS count'])`. Returns a `Map<SpaceId, number>`. Empty `spaceIds` → return empty map without hitting the DB.
4. **Service pass-through** (in `packages/<domain>/src/application/services/<Domain>Service.ts`) — single-line delegation with a `logger.info`.
5. **Adapter wiring** (in `packages/<domain>/src/application/adapter/<Domain>Adapter.ts`, or `adapters/` if plural — see "Common mistakes") — exposes the service method through the port.
6. **Use case fan-out** (in the consuming domain's use case)
   ```ts
   const [admins, memberCount, standardCount, recipeCount, skillCount] =
     await Promise.all([
       this.spacesPort.findAdminsForSpaceIds(spaceIds),
       this.spacesPort.countByRoleForSpaceIds(spaceIds, UserSpaceRole.MEMBER),
       this.standardsPort.countBySpaceIds(spaceIds),
       this.recipesPort.countBySpaceIds(spaceIds),
       this.skillsPort.countBySpaceIds(spaceIds),
     ]);
   ```

## Canonical example
- Commit `5f5ae7151` — recipes implementation (port + repo + service + adapter + repo spec). Copy this diff verbatim for new domains.
- Sibling implementations: `b7a43d79b` (standards), `7b4534508` (skills).
- Consumer: `ListOrganizationSpacesForManagementUseCase` at `packages/spaces-management/src/...` (commit `ad46234a1`).

## Common mistakes
- Returning `Promise<Array<{ spaceId, count }>>` instead of `Map<SpaceId, number>`. The map shape is mandatory — consumers do `map.get(spaceId) ?? 0`.
- Forgetting that `packages/skills/src/application/adapter/` is **singular** (`adapter`), unlike most other packages which use `adapters/`. Mirror the existing folder for the package you're editing.
- Hitting the DB on empty input. Always early-return an empty map when `spaceIds.length === 0`.
- Soft-deletes: if the count query joins another table via raw alias, the auto-`deleted_at IS NULL` filter will NOT propagate. Add it explicitly. (Not relevant for the simple grouped count above, but keep in mind for variants.)
- Using string literals for role parameters in sibling space methods. Use `UserSpaceRole.ADMIN` / `UserSpaceRole.MEMBER`.
