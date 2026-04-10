import { IUseCase, PackmindCommand } from '../../UseCase';

export type DeleteSpaceCommand = PackmindCommand & { spaceId: string };
export type DeleteSpaceResponse = void;
export type IDeleteSpaceUseCase = IUseCase<
  DeleteSpaceCommand,
  DeleteSpaceResponse
>;
