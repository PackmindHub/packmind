import {
  Gateway,
  IGetTrackedRepositoryUseCase,
  ISetTrackedRepositoryUseCase,
  IUpdateTrackedBranchUseCase,
} from '@packmind/types';

export interface IRepositoryTrackingGateway {
  getTrackedRepository: Gateway<IGetTrackedRepositoryUseCase>;
  setTrackedRepository: Gateway<ISetTrackedRepositoryUseCase>;
  updateTrackedBranch: Gateway<IUpdateTrackedBranchUseCase>;
}
