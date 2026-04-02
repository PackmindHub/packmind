import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space, SpaceType } from '../Space';

export type CreateSpaceCommand = PackmindCommand & {
  name: string;
  type?: SpaceType;
};
export type CreateSpaceResponse = Space;

export type ICreateSpaceUseCase = IUseCase<
  CreateSpaceCommand,
  CreateSpaceResponse
>;
