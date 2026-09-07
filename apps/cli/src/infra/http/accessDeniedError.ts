import type {
  SpaceAdminRequiredError,
  SpaceMembershipRequiredError,
  UserAccessErrorReason,
} from '@packmind/node-utils';

/**
 * Every `reason` the server sends when it refuses the *caller* — the account is
 * gone, is not in the organization, is not a member of the space, or lacks a
 * role. Two of them answer 404 (`user_not_found`, `space_membership_required`),
 * which is exactly why this list exists: several CLI call sites read a 404 on
 * their own route as "this feature is not part of your deployment", and without
 * a guard a deleted user would be told their features do not exist.
 *
 * Type-only imports, so nothing from `@packmind/node-utils` reaches the bundle.
 */
type AccessDeniedReason =
  | UserAccessErrorReason
  | SpaceMembershipRequiredError['reason']
  | SpaceAdminRequiredError['reason'];

/**
 * A `Record` rather than an array, so adding a member to any of the unions
 * above is a compile error here until it is given an entry — the same trick
 * `STATUS_BY_KIND` uses in `DomainExceptionFilter` to keep its mapping
 * exhaustive by construction.
 */
const ACCESS_DENIED_REASONS: Record<AccessDeniedReason, true> = {
  user_not_found: true,
  user_not_in_organization: true,
  user_not_an_admin: true,
  space_membership_required: true,
  space_admin_required: true,
};

/**
 * True when the server refused the caller, whatever status it used to say so.
 *
 * Reads the `reason` discriminator `PackmindHttpClient` copies off the response
 * body. It is absent from non-domain errors and from servers older than the
 * discriminator, so an unguarded 404 keeps behaving exactly as it did before.
 */
export function isAccessDeniedError(error: unknown): boolean {
  const reason = (error as { reason?: string } | null | undefined)?.reason;

  return (
    reason !== undefined &&
    ACCESS_DENIED_REASONS[reason as AccessDeniedReason] === true
  );
}
