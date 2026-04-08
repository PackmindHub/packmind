import { IUseCase, PackmindCommand } from '../../UseCase';
import { Space, SpaceType } from '../../spaces/Space';

export type UpdateSpaceCommand = PackmindCommand & {
  spaceId: string;
  name?: string;
  type?: SpaceType;
};

export type UpdateSpaceResponse = Space;

export type IUpdateSpaceUseCase = IUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
>;
