import {
  ICreateStandardUseCase,
  Gateway,
  Space,
  ICreatePackageUseCase,
  INotifyDistributionUseCase,
  IUploadSkillUseCase,
} from '@packmind/types';

export interface IPackmindApi {
  listSpaces: () => Promise<Space[]>;
  createStandard: Gateway<ICreateStandardUseCase>;
  createPackage: Gateway<ICreatePackageUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  uploadSkill: Gateway<IUploadSkillUseCase>;
}
