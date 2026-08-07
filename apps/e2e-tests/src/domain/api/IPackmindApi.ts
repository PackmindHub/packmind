import {
  ICreateStandardUseCase,
  Gateway,
  ICreatePackageUseCase,
  INotifyDistributionUseCase,
  ISetTrackedRepositoryUseCase,
  IUploadSkillUseCase,
  IListUserSpaces,
  IListSkillVersionsUseCase,
} from '@packmind/types';

export interface IPackmindApi {
  listSpaces: Gateway<IListUserSpaces>;
  createStandard: Gateway<ICreateStandardUseCase>;
  createPackage: Gateway<ICreatePackageUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  setTrackedRepository: Gateway<ISetTrackedRepositoryUseCase>;
  uploadSkill: Gateway<IUploadSkillUseCase>;
  listSkillVersions: Gateway<IListSkillVersionsUseCase>;
}
