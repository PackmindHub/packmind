import { IUseCase, PackmindCommand } from '../../UseCase';
import { Skill } from '../Skill';
import { SpaceId } from '../../spaces';

export type CreateSkillCommand = PackmindCommand & {
  name: string;
  description: string;
  prompt: string;
  spaceId: SpaceId;
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
