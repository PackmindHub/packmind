import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../SpaceId';
import { UserSpaceMembership } from '../UserSpaceMembership';

export type ListSpaceMembersCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type ListSpaceMembersResponse = UserSpaceMembership[];

export type IListSpaceMembersUseCase = IUseCase<
  ListSpaceMembersCommand,
  ListSpaceMembersResponse
>;
