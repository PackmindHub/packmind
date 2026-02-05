import {
  Gateway,
  IListPackagesUseCase,
  IGetPackageSummaryUseCase,
  ICreatePackageUseCase,
  IAddArtefactsToPackageUseCase,
} from '@packmind/types';

export interface IPackagesGateway {
  list: Gateway<IListPackagesUseCase>;
  getSummary: Gateway<IGetPackageSummaryUseCase>;
  create: Gateway<ICreatePackageUseCase>;
  addArtefacts: Gateway<IAddArtefactsToPackageUseCase>;
}
