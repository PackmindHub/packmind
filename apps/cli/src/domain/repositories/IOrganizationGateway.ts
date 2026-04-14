import { Organization } from '@packmind/types';

export interface IOrganizationGateway {
  getOrganization(): Promise<Organization>;
}
