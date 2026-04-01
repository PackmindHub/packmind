import { IUseCase, PackmindCommand } from '../../UseCase';
import { UserId } from '../../accounts/User';
import { SpaceId } from '../SpaceId';
import { UserSpaceMembership, UserSpaceRole } from '../UserSpaceMembership';

export type AddMembersToSpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
  members: Array<{ userId: UserId; role: UserSpaceRole }>;
};

export type AddMembersToSpaceResponse = UserSpaceMembership[];

export type IAddMembersToSpaceUseCase = IUseCase<
  AddMembersToSpaceCommand,
  AddMembersToSpaceResponse
>;
