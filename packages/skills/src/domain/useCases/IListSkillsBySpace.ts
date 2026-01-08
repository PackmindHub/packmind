import {
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse,
} from '@packmind/types';

export interface IListSkillsBySpace {
  execute(
    command: ListSkillsBySpaceCommand,
  ): Promise<ListSkillsBySpaceResponse>;
}
