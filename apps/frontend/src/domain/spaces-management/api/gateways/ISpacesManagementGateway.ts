import { Space } from '@packmind/types';

export interface ISpacesManagementGateway {
  createSpace(orgId: string, name: string): Promise<Space>;
}
