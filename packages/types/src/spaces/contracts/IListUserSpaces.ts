import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space } from '../Space';
import { UserSpaceRole } from '../UserSpaceMembership';

export type ListUserSpacesCommand = PackmindCommand;
export type UserSpaceWithRole = Space & { role: UserSpaceRole };
export type ListUserSpacesResponse = { spaces: UserSpaceWithRole[] };

export type IListUserSpaces = IUseCase<
  ListUserSpacesCommand,
  ListUserSpacesResponse
>;
