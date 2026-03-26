import {
  Gateway,
  IListPackagesBySpaceUseCase,
  IGetPackageSummaryUseCase,
  ICreatePackageUseCase,
  IAddArtefactsToPackageUseCase,
} from '@packmind/types';

export interface IPackagesGateway {
  list: Gateway<IListPackagesBySpaceUseCase>;
  getSummary: Gateway<IGetPackageSummaryUseCase>;
  create: Gateway<ICreatePackageUseCase>;
  addArtefacts: Gateway<IAddArtefactsToPackageUseCase>;
}
