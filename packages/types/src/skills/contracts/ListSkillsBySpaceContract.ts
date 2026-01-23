import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type ListSkillsBySpaceCommand = PackmindCommand & {
  spaceId: string;
  includeDeleted?: boolean;
};

export type ListSkillsBySpaceResponse = Skill[];

export type IListSkillsBySpaceUseCase = IUseCase<
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse
>;
