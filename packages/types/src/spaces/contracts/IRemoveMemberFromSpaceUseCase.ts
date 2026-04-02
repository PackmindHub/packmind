import { IUseCase, PackmindCommand } from '../../UseCase';
import { UserId } from '../../accounts/User';
import { SpaceId } from '../SpaceId';

export type RemoveMemberFromSpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
  targetUserId: UserId;
};

export type RemoveMemberFromSpaceResponse = { removed: boolean };

export type IRemoveMemberFromSpaceUseCase = IUseCase<
  RemoveMemberFromSpaceCommand,
  RemoveMemberFromSpaceResponse
>;
