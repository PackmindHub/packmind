import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type ListSkillsBySpaceCommand = PackmindCommand & {
  spaceId: string;
};

export type ListSkillsBySpaceResponse = Skill[];

export type IListSkillsBySpaceUseCase = IUseCase<
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse
>;
