import { IUseCase } from '@packmind/shared';
import { UserId, UserOrganizationRole } from '../entities/User';
import { OrganizationId } from '../entities/Organization';

export type OrganizationUser = {
  userId: UserId;
  email: string;
  role: UserOrganizationRole;
};

export type ListOrganizationUsersCommand = {
  userId: string;
  organizationId: OrganizationId;
};

export type ListOrganizationUsersResponse = {
  users: OrganizationUser[];
};

export type IListOrganizationUsersUseCase = IUseCase<
  ListOrganizationUsersCommand,
  ListOrganizationUsersResponse
>;
