import { IUseCase, PackmindCommand } from '../../UseCase';

export type PinSpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type PinSpaceResponse = Record<string, never>;

export type IPinSpaceUseCase = IUseCase<PinSpaceCommand, PinSpaceResponse>;
