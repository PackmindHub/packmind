import { Organization } from '@packmind/accounts/types';

export interface IOrganizationGateway {
  createOrganization(organization: { name: string }): Promise<Organization>;
  getBySlug(slug: string): Promise<Organization>;
}
