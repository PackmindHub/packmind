/**
 * Shared predicate restricting governance views to the branch Packmind currently
 * tracks.
 *
 * The subquery collects "shadowed" repository rows: branches of a repository whose
 * tracking now sits on a sibling branch in the same organization. Rows on those
 * branches are hidden — never deleted — so moving the tracked branch stays
 * reversible. Repositories in organizations that never used CLI tracking have no
 * tracked sibling, so nothing is shadowed and the legacy "show every branch"
 * behaviour is preserved.
 *
 * Written as an uncorrelated single-column anti-join rather than a correlated
 * NOT EXISTS: it is evaluated once per query instead of once per row, and it stays
 * within the SQL subset the in-memory database used by the integration tests
 * supports. Backed by `idx_git_repos_tracked_owner_repo`.
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
     AND tracked_repo."is_tracked" = true
     AND tracked_repo."deleted_at" IS NULL
    INNER JOIN "git_providers" tracked_provider
      ON tracked_provider."id" = tracked_repo."provider_id"
     AND tracked_provider."organization_id" = :trackedScopeOrganizationId
    WHERE shadowed."is_tracked" = false
  )
)`;

export function trackedBranchScopeParams(organizationId: string): {
  trackedScopeOrganizationId: string;
} {
  return { trackedScopeOrganizationId: organizationId };
}
