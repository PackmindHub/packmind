import {
  Gateway,
  IListPackagesBySpaceUseCase,
  IGetPackageSummaryUseCase,
  ICreatePackageUseCase,
  IAddArtefactsToPackageUseCase,
  IMoveArtefactsToPackageUseCase,
  IRemoveArtefactsFromPackageUseCase,
} from '@packmind/types';

export interface IPackagesGateway {
  list: Gateway<IListPackagesBySpaceUseCase>;
  getSummary: Gateway<IGetPackageSummaryUseCase>;
  create: Gateway<ICreatePackageUseCase>;
  addArtefacts: Gateway<IAddArtefactsToPackageUseCase>;
  moveArtefacts: Gateway<IMoveArtefactsToPackageUseCase>;
  removeArtefacts: Gateway<IRemoveArtefactsFromPackageUseCase>;
}
