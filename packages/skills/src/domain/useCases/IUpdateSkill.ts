import { MemberContext } from '@packmind/node-utils';
import { UpdateSkillCommand, UpdateSkillResponse } from '@packmind/types';

export interface IUpdateSkill {
  executeForMembers(
    command: UpdateSkillCommand & MemberContext,
  ): Promise<UpdateSkillResponse>;
}
