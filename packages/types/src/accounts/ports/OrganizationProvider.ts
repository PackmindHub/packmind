import { Organization, OrganizationId } from '../Organization';

export interface OrganizationProvider {
  getOrganizationById(
    organizationId: OrganizationId,
  ): Promise<Organization | null>;
}
