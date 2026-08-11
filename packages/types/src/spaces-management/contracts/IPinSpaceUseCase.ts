import { IUseCase, SpaceMemberCommand } from '../../UseCase';

export type PinSpaceCommand = SpaceMemberCommand;

export type PinSpaceResponse = Record<string, never>;

export type IPinSpaceUseCase = IUseCase<PinSpaceCommand, PinSpaceResponse>;
