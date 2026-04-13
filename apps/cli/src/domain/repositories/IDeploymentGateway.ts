import {
  ArtifactType,
  Gateway,
  IGetContentByVersionsUseCase,
  IGetDeployedContentUseCase,
  IGetRenderModeConfigurationUseCase,
  IInstallPackagesUseCase,
  INotifyArtefactsDistribution,
  INotifyDistributionUseCase,
  IPullContentUseCase,
} from '@packmind/types';

export interface IDeploymentGateway {
  pull: Gateway<IPullContentUseCase>;
  install: Gateway<IInstallPackagesUseCase>;
  getDeployed: Gateway<IGetDeployedContentUseCase>;
  getContentByVersions: Gateway<IGetContentByVersionsUseCase>;
  notifyDistribution: Gateway<INotifyDistributionUseCase>;
  notifyArtefactsDistribution: Gateway<INotifyArtefactsDistribution>;
  getRenderModeConfiguration: Gateway<IGetRenderModeConfigurationUseCase>;
  getLatestVersion(
    type: ArtifactType,
    id: string,
    spaceId: string,
  ): Promise<{ version: number }>;
}
