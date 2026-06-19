import { IUseCase, PackmindCommand } from '../../UseCase';

export type DeleteSpaceCommand = PackmindCommand & { spaceId: string };
export type DeleteSpaceResponse = Record<string, never>;
export type IDeleteSpaceUseCase = IUseCase<
  DeleteSpaceCommand,
  DeleteSpaceResponse
>;
