import {
  ICreateStandardUseCase,
  Gateway,
  ICreatePackageUseCase,
  ICreatePackageReleaseUseCase,
  INotifyDistributionUseCase,
  IUploadSkillUseCase,
  IListUserSpaces,
  IListSkillVersionsUseCase,
  ISetTrackedRepositoryUseCase,
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
  /** Tracks a repository on a branch, as `packmind-cli git track` does. */
  setTrackedRepository: Gateway<ISetTrackedRepositoryUseCase>;
}
