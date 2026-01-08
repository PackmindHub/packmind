import { DeleteSkillCommand, DeleteSkillResponse } from '@packmind/types';

export interface IDeleteSkill {
  execute(command: DeleteSkillCommand): Promise<DeleteSkillResponse>;
}
