import {
  Gateway,
  IGetTrackedRepositoryUseCase,
  IRemoveTrackedRepositoryUseCase,
  ISetTrackedRepositoryUseCase,
  IUpdateTrackedBranchUseCase,
} from '@packmind/types';

export interface IRepositoryTrackingGateway {
  getTrackedRepository: Gateway<IGetTrackedRepositoryUseCase>;
  setTrackedRepository: Gateway<ISetTrackedRepositoryUseCase>;
  updateTrackedBranch: Gateway<IUpdateTrackedBranchUseCase>;
  removeTrackedRepository: Gateway<IRemoveTrackedRepositoryUseCase>;
}
