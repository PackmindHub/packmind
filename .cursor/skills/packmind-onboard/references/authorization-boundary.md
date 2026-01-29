# Authorization Boundary Placement

Detect where authz checks live and highlight inconsistent placement.

## Search Patterns

### Authorization Check Patterns

```
# Permission checks
canAccess(
hasPermission(
checkPermission(
authorize(
isAuthorized(
can(
cannot(
allowed(
forbidden(

# Role checks
hasRole(
isAdmin(
isOwner(
isMember(
checkRole(
requireRole(
@Roles(
@RequireRole

# Policy checks
policy.
Policy.
evaluate(
enforce(
@Policy(
@Authorize(
@PreAuthorize(
@Secured(

# Guard patterns (NestJS, etc.)
@UseGuards(
Guard
CanActivate
canActivate(

# Middleware auth
authMiddleware
authenticate
requireAuth
ensureAuthenticated
isAuthenticated(
```

### Authorization Libraries

```
# Node.js
casl
@casl/ability
accesscontrol
acl
node-casbin
oso
permit.io

# Python
django-guardian
django-rules
casbin
oso

# Ruby
pundit
cancancan
action_policy

# Java/Kotlin
Spring Security
@PreAuthorize
@PostAuthorize
@Secured

# Go
casbin
opa
```

### Placement Locations

```
# Edge layer (expected)
src/api/
src/http/
src/controllers/
src/routes/
src/middleware/
src/guards/
src/presentation/

# Service layer (sometimes)
src/services/
src/application/

# Domain layer (policy objects)
src/domain/policies/
src/domain/authorization/

# Repository layer (anti-pattern for authz)
src/repositories/
src/infra/persistence/
```

### Inline Authorization (Scattered)

```
# Direct checks in business logic
if (user.role === 'admin')
if (currentUser.id === resource.ownerId)
user.permissions.includes(
roles.includes(

# Hardcoded permission strings
'admin'
'owner'
'read'
'write'
'delete'
```

## Analysis Method

1. **Find all authz checks**: Grep for permission/role/policy checks
2. **Map check locations**: Edge, service, domain, or scattered?
3. **Identify patterns**:
   - Centralized: Guards/middleware/policies
   - Decentralized: Inline checks in services
   - Mixed: Both patterns used
4. **Detect issues**:
   - Bypass risk: Missing checks at edge
   - Duplication: Same check in multiple places
   - Inconsistency: Different approaches in same layer

## Placement Patterns

| Pattern | Location | Trade-offs |
|---------|----------|------------|
| **Edge-only** | Controllers/guards | Simple, but coarse-grained |
| **Service layer** | Application services | Reusable, but can be bypassed |
| **Domain policies** | Policy objects | Fine-grained, clean separation |
| **Scattered** | Throughout codebase | Hard to audit, inconsistent |

## Common Issues

| Issue | Risk | Detection |
|-------|------|-----------|
| **No edge check** | Bypass via direct service call | Service has authz, controller doesn't |
| **Duplicate checks** | Maintenance burden | Same check in controller + service |
| **Hardcoded roles** | Inflexible | `if (role === 'admin')` |
| **Missing for route** | Security hole | Route handler without guard/check |

## Reporting Threshold

Report only if:
- Authorization checks found AND
- (Inconsistent placement OR potential bypasses detected)

## Insight Template

```
INSIGHT:
  id: AUTHZ-[n]
  title: "AUTHORIZATION: [pattern] placement with [N] inconsistencies"
  summary: "Authz checks are [centralized|scattered|mixed]. [concerns]"
  confidence: [high|medium|low]
  evidence:
    pattern: "[edge-only|service-layer|domain-policies|scattered]"
    check_locations:
      edge: [N] checks
      service: [N] checks
      domain: [N] checks
      other: [N] checks
    inconsistencies:
      - path[:line] — authz in [layer] but not at edge
      - path[:line] — duplicate check (also at [other path])
    potential_bypasses:
      - path[:line] — service authz without controller check
    hardcoded_roles:
      - path[:line] — `'admin'` literal
```

## Standard/Command Suggestions

- **Standard**: "Authorize at the edge, then trust downstream" (if duplicated)
- **Standard**: "Use policy objects for complex authorization rules"
- **Standard**: "Never hardcode role names - use constants/enums"
- **Command**: "Add authorization guard to controller"
