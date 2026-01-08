import { GetSkillByIdCommand, GetSkillByIdResponse } from '@packmind/types';

export interface IGetSkillById {
  execute(command: GetSkillByIdCommand): Promise<GetSkillByIdResponse>;
}
