import {
  GetLatestSkillVersionCommand,
  GetLatestSkillVersionResponse,
} from '@packmind/types';

export interface IGetLatestSkillVersion {
  execute(
    command: GetLatestSkillVersionCommand,
  ): Promise<GetLatestSkillVersionResponse>;
}
