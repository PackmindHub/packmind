import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { Space, SpaceType } from '../../spaces/Space';
import { SpaceColor } from '../../spaces/SpaceColor';

export type UpdateSpaceCommand = SpaceMemberCommand & {
  name?: string;
  type?: SpaceType;
  color?: SpaceColor;
};

export type UpdateSpaceResponse = Space;

export type IUpdateSpaceUseCase = IUseCase<
  UpdateSpaceCommand,
  UpdateSpaceResponse
>;
