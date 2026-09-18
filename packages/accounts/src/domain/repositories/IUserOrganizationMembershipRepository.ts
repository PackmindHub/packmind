import { UserId, UserOrganizationRole } from '@packmind/types';
import { OrganizationId } from '@packmind/types';

export interface IUserOrganizationMembershipRepository {
  /**
   * @returns `true` if a membership was removed, `false` when no row matched
   */
  removeMembership(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<boolean>;

  /**
   * @returns `true` if a membership role was updated, `false` when no row matched
   */
  updateRole(
    userId: UserId,
    organizationId: OrganizationId,
    newRole: UserOrganizationRole,
  ): Promise<boolean>;
}
