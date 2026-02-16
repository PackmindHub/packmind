import {
  Gateway,
  IGetDeployedContentUseCase,
  IGetRenderModeConfigurationUseCase,
  INotifyDistributionUseCase,
  IPullContentUseCase,
} from '@packmind/types';

export interface IDeploymentGateway {
  pull: Gateway<IPullContentUseCase>;
  getDeployed: Gateway<IGetDeployedContentUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  getRenderModeConfiguration: Gateway<IGetRenderModeConfigurationUseCase>;
}
