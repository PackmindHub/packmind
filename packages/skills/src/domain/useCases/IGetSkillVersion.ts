import {
  GetSkillVersionCommand,
  GetSkillVersionResponse,
  IGetSkillVersionUseCase,
} from '@packmind/types';

export interface IGetSkillVersion extends IGetSkillVersionUseCase {
  execute(command: GetSkillVersionCommand): Promise<GetSkillVersionResponse>;
}
