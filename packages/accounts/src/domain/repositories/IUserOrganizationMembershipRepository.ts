import { UserId, UserOrganizationRole } from '../entities/User';
import { OrganizationId } from '../entities/Organization';

/**
 * Repository contract dedicated to user-organization membership relations.
 */
export interface IUserOrganizationMembershipRepository {
  /**
   * Remove the membership link between the provided user and organization.
   *
   * @returns `true` if a membership was removed, `false` when no row matched
   */
  removeMembership(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<boolean>;

  /**
   * Update the role of a user within an organization.
   *
   * @returns `true` if a membership role was updated, `false` when no row matched
   */
  updateRole(
    userId: UserId,
    organizationId: OrganizationId,
    newRole: UserOrganizationRole,
  ): Promise<boolean>;
}
