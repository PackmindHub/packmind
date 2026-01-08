import { CreateSkillCommand, CreateSkillResponse } from '@packmind/types';

export interface ICreateSkill {
  execute(command: CreateSkillCommand): Promise<CreateSkillResponse>;
}
