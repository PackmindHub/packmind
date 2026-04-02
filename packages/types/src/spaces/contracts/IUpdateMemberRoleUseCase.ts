import { IUseCase, PackmindCommand } from '../../UseCase';
import { UserId } from '../../accounts/User';
import { SpaceId } from '../SpaceId';
import { UserSpaceRole } from '../UserSpaceMembership';

export type UpdateMemberRoleCommand = PackmindCommand & {
  spaceId: SpaceId;
  targetUserId: UserId;
  role: UserSpaceRole;
};

export type UpdateMemberRoleResponse = { updated: boolean };

export type IUpdateMemberRoleUseCase = IUseCase<
  UpdateMemberRoleCommand,
  UpdateMemberRoleResponse
>;
