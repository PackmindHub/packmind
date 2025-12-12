import {
  IListRecipesBySpaceUseCase,
  NewGateway,
  Organization,
  OrganizationId,
  Space,
} from '@packmind/types';

export interface IPackmindApi {
  listOrganizations: () => Promise<Organization[]>;
  listSpaces: (command: { organizationId: OrganizationId }) => Promise<Space[]>;
  getRecipesBySpace: NewGateway<IListRecipesBySpaceUseCase>;
}
