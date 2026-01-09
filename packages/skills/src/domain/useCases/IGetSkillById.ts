import {
  GetSkillByIdCommand,
  GetSkillByIdResponse,
  IUseCase,
} from '@packmind/types';

export type IGetSkillById = IUseCase<GetSkillByIdCommand, GetSkillByIdResponse>;
