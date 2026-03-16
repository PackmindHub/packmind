# Change Proposal Cache Invalidation

Any frontend mutation that affects package-to-target relationships must keep change proposal queries in sync.

## Rules

* Any `useMutation` that modifies package-to-target relationships (e.g. adding, removing, or updating package targets) must call `await invalidateChangeProposalQueries(queryClient)` inside its `onSuccess` handler, because change proposals reflect the delta between the desired and actual deployment state.
* When invalidating the broad `[ORGANIZATION_QUERY_SCOPE, CHANGE_PROPOSALS_QUERY_SCOPE]` query key, always pass `refetchType: 'all'` so that inactive queries (e.g. per-artifact detail views not currently mounted) are eagerly re-fetched rather than merely marked stale. With a global `staleTime` of 10 minutes, a stale-only mark causes the outdated-detection UI to show stale data when the user navigates to a detail view before the background re-fetch completes.
* The outdated badge for "remove from packages" proposals is computed purely on the frontend using `computeRemovalOutdatedIds` in the artifact detail views — it is not a backend status. This means the freshness of the `listChangeProposalsByArtefact` query directly determines whether the badge appears immediately after a package deletion.
