import { ITargetRepository } from './ITargetRepository';
import { IRecipesDeploymentRepository } from './IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from './IStandardsDeploymentRepository';
import { IRenderModeConfigurationRepository } from './IRenderModeConfigurationRepository';
import { IPackageRepository } from './IPackageRepository';
import { IDistributionRepository } from './IDistributionRepository';
import { IDistributedPackageRepository } from './IDistributedPackageRepository';

/**
 * IDeploymentsRepositories - Repository aggregator interface for the Deployments domain
 *
 * This interface serves as the main repository access point, aggregating all
 * individual repositories through getter methods. This pattern centralizes
 * repository instantiation and provides a clean dependency injection point.
 */
export interface IDeploymentsRepositories {
  /**
   * Get the target repository instance
   */
  getTargetRepository(): ITargetRepository;

  /**
   * Get the recipes deployment repository instance
   */
  getRecipesDeploymentRepository(): IRecipesDeploymentRepository;

  /**
   * Get the standards deployment repository instance
   */
  getStandardsDeploymentRepository(): IStandardsDeploymentRepository;

  /**
   * Get the render mode configuration repository instance
   */
  getRenderModeConfigurationRepository(): IRenderModeConfigurationRepository;

  /**
   * Get the package repository instance
   */
  getPackageRepository(): IPackageRepository;

  /**
   * Get the distribution repository instance
   */
  getDistributionRepository(): IDistributionRepository;

  /**
   * Get the distributed package repository instance
   */
  getDistributedPackageRepository(): IDistributedPackageRepository;
}
