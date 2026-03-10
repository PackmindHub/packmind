# Repositories & REST API Design

## Scoped Repositories

Repositories are scoped to a Space or Organization for tenant data isolation.

### Rules

- All finder methods use `createScopedQueryBuilder(spaceId)` or `createScopedQueryBuilder(organizationId)`
- Never override `findById` — the base class handles soft delete via `QueryOption.includeDeleted`
- All collection-returning domain interface methods include `spaceId` or `organizationId` as a parameter
- Write operations delegate to `this.add()` (inherited from `AbstractRepository`)
- Cross-scope isolation must be tested for every collection-returning finder

### TypeORM Rules

- Use QueryBuilder with parameterized queries — never raw SQL strings
- Array filtering uses IN clause with spread syntax: `:...paramName`
- Soft deletes: use `withDeleted()` or `includeDeleted` options; always respect `QueryOption`
- No N+1 queries — if a loop calls the database, use joins or batch loading instead
- Eager loading is explicit and intentional — relations loaded only when needed

---

## REST API Endpoint Design

### Rules

- Use dedicated POST action endpoints (`/reject`, `/accept`) instead of generic PATCH with a status field
- Only include resource IDs from the ownership chain in the route — omit IDs of related but non-parent resources
- One endpoint per business action — not a single endpoint handling multiple actions via request body
- Request validation at controller boundary — DTOs with class-validator
- Response shapes match contract types in `packages/types/` — no ad-hoc response construction
- Error responses use domain-specific error classes mapped to proper HTTP status codes

### Example: Action Endpoints

```
✅ POST /orgs/:orgId/reviews/:reviewId/reject
✅ POST /orgs/:orgId/reviews/:reviewId/accept
❌ PATCH /orgs/:orgId/reviews/:reviewId  { status: 'rejected' }
```
