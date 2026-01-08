import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type UpdateSkillCommand = PackmindCommand & {
  skillId: string;
  name?: string;
  description?: string;
  prompt?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
};

export type UpdateSkillResponse = Skill;

export type IUpdateSkillUseCase = IUseCase<
  UpdateSkillCommand,
  UpdateSkillResponse
>;
