import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { UserId, UserOrganizationRole } from '../User';
import { OrganizationId } from '../Organization';

export type OrganizationUser = {
  userId: UserId;
  email: string;
  role: UserOrganizationRole;
};

export type ListOrganizationUsersCommand = PackmindCommand & {
  organizationId: OrganizationId;
};

export type ListOrganizationUsersResponse = PackmindResult & {
  users: OrganizationUser[];
};

export type IListOrganizationUsersUseCase = IUseCase<
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse
>;
