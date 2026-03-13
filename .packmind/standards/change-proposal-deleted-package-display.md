# Change Proposal — Deleted Package Display

When rendering a package name from a `packageMap` built off `useListPackagesBySpaceQuery`, the package may no longer exist (soft-deleted). A missing entry must be handled consistently.

## Rules

* When displaying a package name resolved from a `packageMap` keyed by `PackageId`, always use `'Deleted package'` as the fallback string when the lookup returns `undefined` (i.e. `packageMap.get(packageId) ?? 'Deleted package'`). Do not fall back to the raw UUID, as it is meaningless to end users.
