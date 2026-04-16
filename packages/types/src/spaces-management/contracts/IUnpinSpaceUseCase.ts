import { IUseCase, PackmindCommand } from '../../UseCase';

export type UnpinSpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type UnpinSpaceResponse = Record<string, never>;

export type IUnpinSpaceUseCase = IUseCase<
  UnpinSpaceCommand,
  UnpinSpaceResponse
>;
