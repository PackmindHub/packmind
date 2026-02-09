import {
  Gateway,
  IGetRenderModeConfigurationUseCase,
  INotifyDistributionUseCase,
  IPullContentUseCase,
} from '@packmind/types';

export interface IDeploymentGateway {
  pull: Gateway<IPullContentUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  getRenderModeConfiguration: Gateway<IGetRenderModeConfigurationUseCase>;
}
