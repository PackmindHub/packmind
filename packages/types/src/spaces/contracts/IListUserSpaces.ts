import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space } from '../Space';

export type ListUserSpacesCommand = PackmindCommand;
export type ListUserSpacesResponse = {
  spaces: Space[];
  discoverableSpaces: Space[];
};

export type IListUserSpaces = IUseCase<
  ListUserSpacesCommand,
  ListUserSpacesResponse
>;
