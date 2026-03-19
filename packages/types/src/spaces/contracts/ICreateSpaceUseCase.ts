import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space } from '../Space';

export type CreateSpaceCommand = PackmindCommand & { name: string };
export type CreateSpaceResponse = Space;

export type ICreateSpaceUseCase = IUseCase<
  CreateSpaceCommand,
  CreateSpaceResponse
>;
