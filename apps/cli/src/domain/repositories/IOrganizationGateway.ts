import { Organization, UserOrganizationRole } from '@packmind/types';

export interface IOrganizationGateway {
  getOrganization(): Promise<Organization>;
  getCurrentUserRole(): UserOrganizationRole | null;
}
