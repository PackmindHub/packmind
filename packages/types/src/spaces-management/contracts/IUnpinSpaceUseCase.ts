import { IUseCase, SpaceMemberCommand } from '../../UseCase';

export type UnpinSpaceCommand = SpaceMemberCommand;

export type UnpinSpaceResponse = Record<string, never>;

export type IUnpinSpaceUseCase = IUseCase<
  UnpinSpaceCommand,
  UnpinSpaceResponse
>;
