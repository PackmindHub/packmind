import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';
import { SpaceId } from '../../spaces';

export type ListSkillsBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
  includeDeleted?: boolean;
};

export type ListSkillsBySpaceResponse = Skill[];

export type IListSkillsBySpaceUseCase = IUseCase<
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse
>;
