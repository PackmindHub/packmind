import {
  GetSkillVersionCommand,
  GetSkillVersionResponse,
} from '@packmind/types';

export interface IGetSkillVersion {
  execute(command: GetSkillVersionCommand): Promise<GetSkillVersionResponse>;
}
