import { Organization, NewGateway } from '@packmind/types';
import {
  ICreateInvitationsUseCase,
  IRemoveUserFromOrganizationUseCase,
  IRenameOrganizationUseCase,
} from '@packmind/types';

export interface IOrganizationGateway {
  createOrganization(organization: { name: string }): Promise<Organization>;
  getByName(name: string): Promise<Organization>;
  getUserOrganizations(): Promise<Organization[]>;
  inviteUsers: NewGateway<ICreateInvitationsUseCase>;
  removeUser: NewGateway<IRemoveUserFromOrganizationUseCase>;
  renameOrganization: NewGateway<IRenameOrganizationUseCase>;
}
