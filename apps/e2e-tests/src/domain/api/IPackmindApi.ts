import {
  ICreateStandardUseCase,
  Gateway,
  ICreatePackageUseCase,
  INotifyDistributionUseCase,
  IUploadSkillUseCase,
  IListUserSpaces,
} from '@packmind/types';

export interface IPackmindApi {
  listSpaces: Gateway<IListUserSpaces>;
  createStandard: Gateway<ICreateStandardUseCase>;
  createPackage: Gateway<ICreatePackageUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  uploadSkill: Gateway<IUploadSkillUseCase>;
}
