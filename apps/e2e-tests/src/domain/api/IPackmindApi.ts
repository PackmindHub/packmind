import {
  ICreateStandardUseCase,
  Gateway,
  Space,
  ICreatePackageUseCase,
  INotifyDistributionUseCase,
} from '@packmind/types';

export interface IPackmindApi {
  listSpaces: () => Promise<Space[]>;
  createStandard: Gateway<ICreateStandardUseCase>;
  createPackage: Gateway<ICreatePackageUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
}
