import {
  FindSkillBySlugCommand,
  FindSkillBySlugResponse,
  IFindSkillBySlugUseCase,
} from '@packmind/types';

export interface IFindSkillBySlug extends IFindSkillBySlugUseCase {
  execute(command: FindSkillBySlugCommand): Promise<FindSkillBySlugResponse>;
}
