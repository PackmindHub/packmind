import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type FindSkillBySlugCommand = PackmindCommand & {
  slug: string;
};

export type FindSkillBySlugResponse = { skill: Skill | null };

export type IFindSkillBySlugUseCase = IUseCase<
  FindSkillBySlugCommand,
  FindSkillBySlugResponse
>;
