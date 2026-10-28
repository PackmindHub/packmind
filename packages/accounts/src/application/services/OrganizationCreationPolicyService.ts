import { Configuration } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { User } from '@packmind/types';
import { OrganizationService } from './OrganizationService';
import { OrganizationCreationRestrictedError } from '../../domain/errors/OrganizationCreationRestrictedError';

const origin = 'OrganizationCreationPolicyService';

const RESTRICT_ORGANIZATION_CREATION_CONFIG_KEY =
  'RESTRICT_ORGANIZATION_CREATION_TO_ADMINS';

export class OrganizationCreationPolicyService {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /**
   * `user` must come from the database, not the JWT: the admin role is checked
   * on its memberships. Pass `null` for an anonymous sign-up.
   */
  async canCreateOrganization(user: User | null): Promise<boolean> {
    if (!(await this.isRestricted())) {
      return true;
    }

    // A fresh install must still be able to create its very first organization.
    if ((await this.organizationService.countOrganizations()) === 0) {
      return true;
    }

    return (
      user?.memberships.some((membership) => membership.role === 'admin') ??
      false
    );
  }

  async assertCanCreateOrganization(user: User | null): Promise<void> {
    if (!(await this.canCreateOrganization(user))) {
      this.logger.warn('Organization creation refused by policy', {
        userId: user?.id,
      });
      throw new OrganizationCreationRestrictedError(user?.id);
    }
  }

  private async isRestricted(): Promise<boolean> {
    const value = await Configuration.getConfig(
      RESTRICT_ORGANIZATION_CREATION_CONFIG_KEY,
    );
    return value === 'true';
  }
}
