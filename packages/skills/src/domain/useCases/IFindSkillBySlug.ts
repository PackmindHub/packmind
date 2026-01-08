import {
  FindSkillBySlugCommand,
  FindSkillBySlugResponse,
} from '@packmind/types';

export interface IFindSkillBySlug {
  execute(command: FindSkillBySlugCommand): Promise<FindSkillBySlugResponse>;
}
