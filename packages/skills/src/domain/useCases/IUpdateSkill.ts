import { UpdateSkillCommand, UpdateSkillResponse } from '@packmind/types';

export interface IUpdateSkill {
  execute(command: UpdateSkillCommand): Promise<UpdateSkillResponse>;
}
