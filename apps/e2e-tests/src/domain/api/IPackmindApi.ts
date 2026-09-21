import {
  ICreateStandardUseCase,
  Gateway,
  ICreatePackageUseCase,
  ICreatePackageReleaseUseCase,
  INotifyDistributionUseCase,
  IUploadSkillUseCase,
  IListUserSpaces,
  IListSkillVersionsUseCase,
} from '@packmind/types';

export interface IPackmindApi {
  listSpaces: Gateway<IListUserSpaces>;
  createStandard: Gateway<ICreateStandardUseCase>;
  createPackage: Gateway<ICreatePackageUseCase>;
  /** Cuts a release behind the browser's back, to lose a race on purpose. */
  createPackageRelease: Gateway<ICreatePackageReleaseUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  uploadSkill: Gateway<IUploadSkillUseCase>;
  listSkillVersions: Gateway<IListSkillVersionsUseCase>;
}
