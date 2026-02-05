import {
  Gateway,
  INotifyDistributionUseCase,
  IPullContentUseCase,
} from '@packmind/types';

export interface IDeploymentGateway {
  pull: Gateway<IPullContentUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
}
