# Space CRUD — Design Spec

**Goal:** Allow organizations to create, update, and delete spaces to structure their artifacts into logical groups with public/private visibility.

**Scope:**
- **In:** Create space, update space (name, description, visibility), delete empty space, Global space protection, new `description` and `isPublic` fields
- **Out:** Artefact moves between spaces, visibility-based access control enforcement, bulk operations

## Architecture

The `packages/spaces` domain is extended with new use cases and service methods. It remains the owner of the Space entity. For deletion guards, SpacesHexa gains cross-domain dependencies on artefact ports to check whether a space is empty.

**Dependency direction after this change:**
- SpacesHexa → IRecipesPort, IStandardsPort, ISkillsPort, IDeploymentPort, IPlaybookChangeManagementPort (for countBySpace only)
- All other domains → ISpacesPort (unchanged)

## Data Model

### Space entity (updated)

```typescript
type Space = {
  id: SpaceId;
  name: string;
  description: string | null;   // NEW — optional text description
  slug: string;
  isPublic: boolean;             // NEW — default true
  organizationId: OrganizationId;
};
```

### Migration

- Add `description` column: `varchar`, nullable
- Add `is_public` column: `boolean`, NOT NULL, default `true`
- Backfill: all existing spaces get `is_public = true`, `description = NULL`

### Schema update

`SpaceSchema` in `packages/spaces/src/infra/schemas/` updated with the two new columns.

## Use Cases / Services

### CreateSpace

- **UseCase:** Validates organizationId, delegates to service
- **Service:** Generates slug from name, validates slug uniqueness within org, creates Space with `isPublic` (default `true`) and `description` (default `null`)
- **Error:** `SpaceSlugConflictError` if slug already exists

### UpdateSpace

- **UseCase:** Finds space by ID, validates it exists, validates it belongs to org, blocks if Global space, delegates to service
- **Service:** Updates name (regenerates slug if name changed, validates uniqueness), description, isPublic. Partial update — only provided fields change
- **Errors:** `SpaceNotFoundError`, `GlobalSpaceProtectedError`, `SpaceSlugConflictError`

### DeleteSpace

- **UseCase:** Finds space by ID, validates it exists, validates it belongs to org, blocks if Global space, checks all artefact ports for `countBySpace(spaceId) > 0`, delegates to service
- **Service:** Soft-deletes the space
- **Errors:** `SpaceNotFoundError`, `GlobalSpaceProtectedError`, `SpaceNotEmptyError`

### Cross-domain port additions

Each artefact domain port gets a new method:

| Port | New method |
|---|---|
| `IRecipesPort` | `countRecipesBySpace(spaceId: SpaceId): Promise<number>` |
| `IStandardsPort` | `countStandardsBySpace(spaceId: SpaceId): Promise<number>` |
| `ISkillsPort` | `countSkillsBySpace(spaceId: SpaceId): Promise<number>` |
| `IDeploymentPort` | `countPackagesBySpace(spaceId: SpaceId): Promise<number>` |
| `IPlaybookChangeManagementPort` | `countChangeProposalsBySpace(spaceId: SpaceId): Promise<number>` |

Each domain implements this in its own service/repository.

## API Surface

### New endpoints

All under existing `OrganizationAccessGuard`:

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `POST` | `/organizations/:orgId/spaces` | `{ name: string, description?: string, isPublic?: boolean }` | `201` — Space |
| `PATCH` | `/organizations/:orgId/spaces/:spaceId` | `{ name?: string, description?: string, isPublic?: boolean }` | `200` — Space |
| `DELETE` | `/organizations/:orgId/spaces/:spaceId` | — | `204` |

### Error responses

| Error | HTTP Status | When |
|---|---|---|
| `SpaceSlugConflictError` | `409 Conflict` | Slug already exists in org |
| `SpaceNotFoundError` | `404 Not Found` | Space ID doesn't exist |
| `GlobalSpaceProtectedError` | `403 Forbidden` | Attempt to update/delete Global space |
| `SpaceNotEmptyError` | `409 Conflict` | Attempt to delete space with artefacts |

### Existing endpoints unchanged

- `GET /organizations/:orgId/spaces` — list spaces
- `GET /organizations/:orgId/spaces/:slug` — get by slug

## Testing Approach

| Layer | Coverage |
|---|---|
| `SpaceService.createSpace` | Slug generation, uniqueness check, default values |
| `SpaceService.updateSpace` | Partial update, slug regeneration, uniqueness |
| `SpaceService.deleteSpace` | Soft delete |
| `CreateSpaceUseCase` | Org validation, delegation |
| `UpdateSpaceUseCase` | Global protection, not-found, ownership check |
| `DeleteSpaceUseCase` | Global protection, not-found, non-empty check (mocked ports), ownership |
| `countBySpace` per domain | Repository query correctness (per domain) |
| API controller | DTO validation, guard wiring, status codes |

## Out of Scope

- Visibility-based access control enforcement (stored but not enforced)
- Moving artefacts between spaces
- Bulk space operations
- Space ordering or hierarchy
- Space-level permissions/roles
