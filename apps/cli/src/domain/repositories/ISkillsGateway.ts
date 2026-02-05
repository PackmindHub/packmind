import {
  Gateway,
  IDeployDefaultSkillsUseCase,
  IListSkillsBySpaceUseCase,
  IUploadSkillUseCase,
} from '@packmind/types';

export interface ISkillsGateway {
  upload: Gateway<IUploadSkillUseCase>;
  getDefaults: Gateway<IDeployDefaultSkillsUseCase>;
  list: Gateway<IListSkillsBySpaceUseCase>;
}
