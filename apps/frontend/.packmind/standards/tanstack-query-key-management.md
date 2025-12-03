# TanStack Query Key Management

TanStack Query uses prefix matching to invalidate cached queries, matching keys from left to right like a file path. Properly structured query keys enable efficient cache invalidation at any scope level (organization-wide, domain-wide, or specific operations). Each domain defines its query scope constant and operation enum in a dedicated queryKeys.ts file, ensuring type safety and preventing circular dependencies when domains import each other's keys for invalidation.

## Rules

* Limit cross-domain imports to only query key constants and enums to prevent runtime coupling and circular dependencies
* Define base query key arrays as const to enable precise invalidation patterns and avoid duplication
* Define domain query scope as a separate const outside enum to maintain clear separation between scope and operations
* Use query invalidation with prefix matching from key start in correct hierarchical order
* Define query keys in a dedicated queryKeys.ts file in the domain's api folder for centralized management
* Follow hierarchical query key structure: organization scope, domain scope, operation, then identifiers for consistent invalidation patterns
