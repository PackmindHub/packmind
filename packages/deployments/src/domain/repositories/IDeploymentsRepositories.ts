import { ITargetRepository } from './ITargetRepository';
import { IRenderModeConfigurationRepository } from './IRenderModeConfigurationRepository';
import { IPackageRepository } from './IPackageRepository';
import { IDistributionRepository } from './IDistributionRepository';
import { IDistributedPackageRepository } from './IDistributedPackageRepository';

export interface IDeploymentsRepositories {
  getTargetRepository(): ITargetRepository;

  getRenderModeConfigurationRepository(): IRenderModeConfigurationRepository;

  getPackageRepository(): IPackageRepository;

  getDistributionRepository(): IDistributionRepository;

  getDistributedPackageRepository(): IDistributedPackageRepository;
}
