import {
  Gateway,
  IGetContentByVersionsUseCase,
  IGetDeployedContentUseCase,
  IGetRenderModeConfigurationUseCase,
  INotifyDistributionUseCase,
  IPullContentUseCase,
} from '@packmind/types';

export interface IDeploymentGateway {
  pull: Gateway<IPullContentUseCase>;
  getDeployed: Gateway<IGetDeployedContentUseCase>;
  getContentByVersions: Gateway<IGetContentByVersionsUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  getRenderModeConfiguration: Gateway<IGetRenderModeConfigurationUseCase>;
}
