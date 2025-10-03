import { IUseCase, PackmindCommand } from '../../UseCase';
import { UserId, UserOrganizationRole } from '../User';

export type ChangeUserRoleCommand = PackmindCommand & {
  targetUserId: UserId;
  newRole: UserOrganizationRole;
};

export type ChangeUserRoleResponse = {
  success: boolean;
  updatedRole: UserOrganizationRole;
};

export type IChangeUserRoleUseCase = IUseCase<
  ChangeUserRoleCommand,
  ChangeUserRoleResponse
>;
