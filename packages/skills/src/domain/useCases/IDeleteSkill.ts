import {
  DeleteSkillCommand,
  DeleteSkillResponse,
  IDeleteSkillUseCase,
} from '@packmind/types';

export interface IDeleteSkill extends IDeleteSkillUseCase {
  execute(command: DeleteSkillCommand): Promise<DeleteSkillResponse>;
}
