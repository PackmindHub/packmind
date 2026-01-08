import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type GetSkillByIdCommand = PackmindCommand & {
  skillId: string;
};

export type GetSkillByIdResponse = { skill: Skill | null };

export type IGetSkillByIdUseCase = IUseCase<
  GetSkillByIdCommand,
  GetSkillByIdResponse
>;
