import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space } from '../Space';

export type ListUserSpacesCommand = PackmindCommand;
export type ListUserSpacesResponse = Space[];

export type IListUserSpaces = IUseCase<
  ListUserSpacesCommand,
  ListUserSpacesResponse
>;
