import { DataSource, Repository } from 'typeorm';
import { IDeploymentsRepositories } from '../../domain/repositories/IDeploymentsRepositories';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { IPackagesDeploymentRepository } from '../../domain/repositories/IPackagesDeploymentRepository';
import { IRenderModeConfigurationRepository } from '../../domain/repositories/IRenderModeConfigurationRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { TargetRepository } from './TargetRepository';
import { PackagesDeploymentRepository } from './PackagesDeploymentRepository';
import { RenderModeConfigurationRepository } from './RenderModeConfigurationRepository';
import { PackageRepository } from './PackageRepository';
import { DistributionRepository } from './DistributionRepository';
import { DistributedPackageRepository } from './DistributedPackageRepository';
import { TargetSchema } from '../schemas/TargetSchema';
import { PackagesDeploymentSchema } from '../schemas/PackagesDeploymentSchema';
import { RenderModeConfigurationSchema } from '../schemas/RenderModeConfigurationSchema';
import { PackageSchema } from '../schemas/PackageSchema';
import { DistributionSchema } from '../schemas/DistributionSchema';
import { DistributedPackageSchema } from '../schemas/DistributedPackageSchema';
import {
  Target,
  RenderModeConfiguration,
  PackagesDeployment,
  Package,
  Distribution,
  DistributedPackage,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

/**
 * DeploymentsRepositories - Repository aggregator implementation for the Deployments domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * using the shared DataSource and provides them through getter methods.
 */
export class DeploymentsRepositories implements IDeploymentsRepositories {
  private readonly targetRepository: ITargetRepository;
  private readonly packagesDeploymentRepository: IPackagesDeploymentRepository;
  private readonly renderModeConfigurationRepository: IRenderModeConfigurationRepository;
  private readonly packageRepository: IPackageRepository;
  private readonly distributionRepository: IDistributionRepository;
  private readonly distributedPackageRepository: IDistributedPackageRepository;

  constructor(private readonly dataSource: DataSource) {
    // Initialize all repositories with their respective schemas
    this.targetRepository = new TargetRepository(
      this.dataSource.getRepository(TargetSchema) as Repository<Target>,
    );
    this.packagesDeploymentRepository = new PackagesDeploymentRepository(
      this.dataSource.getRepository(
        PackagesDeploymentSchema,
      ) as Repository<PackagesDeployment>,
    );
    this.renderModeConfigurationRepository =
      new RenderModeConfigurationRepository(
        this.dataSource.getRepository(
          RenderModeConfigurationSchema,
        ) as Repository<RenderModeConfiguration>,
      );
    this.packageRepository = new PackageRepository(
      this.dataSource.getRepository(PackageSchema) as Repository<Package>,
    );
    this.distributionRepository = new DistributionRepository(
      this.dataSource.getRepository(
        DistributionSchema,
      ) as Repository<Distribution>,
    );
    this.distributedPackageRepository = new DistributedPackageRepository(
      this.dataSource.getRepository(
        DistributedPackageSchema,
      ) as Repository<DistributedPackage>,
    );
  }

  getTargetRepository(): ITargetRepository {
    return this.targetRepository;
  }

  getPackagesDeploymentRepository(): IPackagesDeploymentRepository {
    return this.packagesDeploymentRepository;
  }

  getRenderModeConfigurationRepository(): IRenderModeConfigurationRepository {
    return this.renderModeConfigurationRepository;
  }

  getPackageRepository(): IPackageRepository {
    return this.packageRepository;
  }

  getDistributionRepository(): IDistributionRepository {
    return this.distributionRepository;
  }

  getDistributedPackageRepository(): IDistributedPackageRepository {
    return this.distributedPackageRepository;
  }
}
