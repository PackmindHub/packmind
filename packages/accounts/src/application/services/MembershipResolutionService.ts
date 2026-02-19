import {
  Organization,
  OrganizationId,
  User,
  UserOrganizationRole,
} from '@packmind/types';
import { OrganizationService } from './OrganizationService';
import { OrganizationNotFoundError } from '../../domain/errors/OrganizationNotFoundError';

export type ResolvedMemberships = {
  organization?: Organization;
  role?: UserOrganizationRole;
  organizations?: Array<{
    organization: Organization;
    role: UserOrganizationRole;
  }>;
};

export function getPrimaryOrganizationId(
  resolved: ResolvedMemberships,
): OrganizationId | undefined {
  return (
    resolved.organization?.id ?? resolved.organizations?.[0]?.organization.id
  );
}

export class MembershipResolutionService {
  constructor(private readonly organizationService: OrganizationService) {}

  async resolveUserOrganizations(user: User): Promise<ResolvedMemberships> {
    if (user.memberships.length === 0) {
      return { organizations: [] };
    }

    if (user.memberships.length === 1) {
      const membership = user.memberships[0];
      const organization = await this.organizationService.getOrganizationById(
        membership.organizationId,
      );

      if (!organization) {
        throw new OrganizationNotFoundError(membership.organizationId);
      }

      return { organization, role: membership.role };
    }

    const organizationsWithRoles = await Promise.all(
      user.memberships.map(async (membership) => {
        const organization = await this.organizationService.getOrganizationById(
          membership.organizationId,
        );

        if (!organization) {
          throw new OrganizationNotFoundError(membership.organizationId);
        }

        return { organization, role: membership.role };
      }),
    );

    return { organizations: organizationsWithRoles };
  }
}
