/**
 * Shared predicate restricting governance views to the branch Packmind currently
 * governs.
 *
 * The subquery collects "shadowed" repository rows: branches of a repository
 * whose tracking now sits on a sibling branch in the same organization, or whose
 * tracking an admin has removed altogether. Rows on those branches are hidden —
 * never deleted — so both moving the tracked branch and removing tracking stay
 * reversible. Repositories in organizations that never used CLI tracking have no
 * governing sibling, so nothing is shadowed and the legacy "show every branch"
 * behaviour is preserved.
 *
 * A row can qualify as its own governing sibling: there is no
 * `tracked_repo."id" <> shadowed."id"` condition. That is what makes removal
 * hide the whole repository — a removed row shadows itself and every other
 * branch of the same repository. Without it, a repository with no tracked
 * sibling would be left alone and the overview would revert to listing every
 * branch, which is worse than before the removal.
 *
 * Written as an uncorrelated single-column anti-join rather than a correlated
 * NOT EXISTS: it is evaluated once per query instead of once per row, and it stays
 * within the SQL subset the in-memory database used by the integration tests
 * supports. Backed by `idx_git_repos_tracked_owner_repo` and
 * `idx_git_repos_tracking_removed_owner_repo` — one partial index per arm of the
 * disjunction, since neither covers both.
 *
 * Columns are fully-qualified quoted identifiers rather than TypeORM property paths
 * because TypeORM only rewrites `alias.property` when the match is followed by a
 * space, `=`, `)` or `,` — a reference at the end of a line is silently left as-is
 * and fails at runtime.
 *
 * Callers must have joined the repository under the alias `gitRepo` and must bind
 * `trackedScopeOrganizationId` (see `trackedBranchScopeParams`).
 */
export const TRACKED_BRANCH_SCOPE = `(
  "gitRepo"."id" IS NULL
  OR "gitRepo"."id" NOT IN (
    SELECT shadowed."id"
    FROM "git_repos" shadowed
    INNER JOIN "git_providers" shadowed_provider
      ON shadowed_provider."id" = shadowed."provider_id"
     AND shadowed_provider."organization_id" = :trackedScopeOrganizationId
    INNER JOIN "git_repos" tracked_repo
      ON tracked_repo."owner" = shadowed."owner"
     AND tracked_repo."repo" = shadowed."repo"
     AND tracked_repo."deleted_at" IS NULL
    INNER JOIN "git_providers" tracked_provider
      ON tracked_provider."id" = tracked_repo."provider_id"
     AND tracked_provider."organization_id" = :trackedScopeOrganizationId
    WHERE shadowed."is_tracked" = false
      AND (
        tracked_repo."is_tracked" = true
        OR tracked_repo."tracking_removed_at" IS NOT NULL
      )
  )
)`;

export function trackedBranchScopeParams(organizationId: string): {
  trackedScopeOrganizationId: string;
} {
  return { trackedScopeOrganizationId: organizationId };
}
