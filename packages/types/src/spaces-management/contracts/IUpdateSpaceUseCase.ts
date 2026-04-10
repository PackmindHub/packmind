import { IUseCase, SpaceAdminCommand } from '../../UseCase';
import { Space, SpaceType } from '../../spaces/Space';

export type UpdateSpaceCommand = SpaceAdminCommand & {
  name?: string;
  type?: SpaceType;
};

export type UpdateSpaceResponse = Space;

export type IUpdateSpaceUseCase = IUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
>;
