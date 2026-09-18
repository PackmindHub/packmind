import { ITargetRepository } from './ITargetRepository';
import { IRenderModeConfigurationRepository } from './IRenderModeConfigurationRepository';
import { IPackageRepository } from './IPackageRepository';
import { IDistributionRepository } from './IDistributionRepository';
import { IDistributedPackageRepository } from './IDistributedPackageRepository';
import { IPackageReleaseRepository } from './IPackageReleaseRepository';

export interface IDeploymentsRepositories {
  getTargetRepository(): ITargetRepository;

  getRenderModeConfigurationRepository(): IRenderModeConfigurationRepository;

  getPackageRepository(): IPackageRepository;

  getDistributionRepository(): IDistributionRepository;

  getDistributedPackageRepository(): IDistributedPackageRepository;

  /**
   * Get the package release repository instance
   */
  getPackageReleaseRepository(): IPackageReleaseRepository;
}
