import { UploadSkillCommand, UploadSkillResponse } from '@packmind/types';

export interface IUploadSkill {
  execute(command: UploadSkillCommand): Promise<UploadSkillResponse>;
}
