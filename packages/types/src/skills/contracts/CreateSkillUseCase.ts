import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';

export type CreateSkillCommand = PackmindCommand & {
  name: string;
  description: string;
  prompt: string;
  spaceId: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
};

export type CreateSkillResponse = Skill;

export type ICreateSkillUseCase = IUseCase<
  CreateSkillCommand,
  CreateSkillResponse
>;
