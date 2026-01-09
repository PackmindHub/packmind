import { MemberContext } from '@packmind/node-utils';
import {
  ListSkillsBySpaceCommand,
  ListSkillsBySpaceResponse,
} from '@packmind/types';

export interface IListSkillsBySpace {
  executeForMembers(
    command: ListSkillsBySpaceCommand & MemberContext,
  ): Promise<ListSkillsBySpaceResponse>;
}
