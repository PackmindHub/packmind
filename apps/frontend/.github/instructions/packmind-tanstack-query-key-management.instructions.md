---
applyTo: 'apps/frontend/**/*.tsx'
---
## Standard: TanStack Query Key Management

Manage TanStack Query key structures using hierarchical prefix matching and dedicated queryKeys.ts files in React applications to ensure efficient cache invalidation and type-safe query management when handling cross-domain data operations. :
* Define base query key arrays as const to enable precise invalidation patterns and avoid duplication
* Define domain query scope as a separate const outside enum to maintain clear separation between scope and operations
* Define query keys in a dedicated queryKeys.ts file in the domain's api folder for centralized management
* Follow hierarchical query key structure: organization scope, domain scope, operation, then identifiers for consistent invalidation patterns
* Limit cross-domain imports to only query key constants and enums to prevent runtime coupling and circular dependencies
* Use query invalidation with prefix matching from key start in correct hierarchical order

Full standard is available here for further request: [TanStack Query Key Management](../../.packmind/standards/tanstack-query-key-management.md)