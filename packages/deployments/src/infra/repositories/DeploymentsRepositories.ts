import { DataSource, Repository } from 'typeorm';
import { IDeploymentsRepositories } from '../../domain/repositories/IDeploymentsRepositories';
import { ITargetRepository } from '../../domain/repositories/ITargetRepository';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { IPackagesDeploymentRepository } from '../../domain/repositories/IPackagesDeploymentRepository';
import { IRenderModeConfigurationRepository } from '../../domain/repositories/IRenderModeConfigurationRepository';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';
import { TargetRepository } from './TargetRepository';
import { RecipesDeploymentRepository } from './RecipesDeploymentRepository';
import { StandardsDeploymentRepository } from './StandardsDeploymentRepository';
import { PackagesDeploymentRepository } from './PackagesDeploymentRepository';
import { RenderModeConfigurationRepository } from './RenderModeConfigurationRepository';
import { PackageRepository } from './PackageRepository';
import { TargetSchema } from '../schemas/TargetSchema';
import { RecipesDeploymentSchema } from '../schemas/RecipesDeploymentSchema';
import { StandardsDeploymentSchema } from '../schemas/StandardsDeploymentSchema';
import { PackagesDeploymentSchema } from '../schemas/PackagesDeploymentSchema';
import { RenderModeConfigurationSchema } from '../schemas/RenderModeConfigurationSchema';
import { PackageSchema } from '../schemas/PackageSchema';
import {
  Target,
  RenderModeConfiguration,
  RecipesDeployment,
  StandardsDeployment,
  PackagesDeployment,
  Package,
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
  private readonly recipesDeploymentRepository: IRecipesDeploymentRepository;
  private readonly standardsDeploymentRepository: IStandardsDeploymentRepository;
  private readonly packagesDeploymentRepository: IPackagesDeploymentRepository;
  private readonly renderModeConfigurationRepository: IRenderModeConfigurationRepository;
  private readonly packageRepository: IPackageRepository;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger,
  ) {
    // Initialize all repositories with their respective schemas
    this.targetRepository = new TargetRepository(
      this.dataSource.getRepository(TargetSchema) as Repository<Target>,
      this.logger,
    );
    this.recipesDeploymentRepository = new RecipesDeploymentRepository(
      this.dataSource.getRepository(
        RecipesDeploymentSchema,
      ) as Repository<RecipesDeployment>,
      this.logger,
    );
    this.standardsDeploymentRepository = new StandardsDeploymentRepository(
      this.dataSource.getRepository(
        StandardsDeploymentSchema,
      ) as Repository<StandardsDeployment>,
      this.logger,
    );
    this.packagesDeploymentRepository = new PackagesDeploymentRepository(
      this.dataSource.getRepository(
        PackagesDeploymentSchema,
      ) as Repository<PackagesDeployment>,
      this.logger,
    );
    this.renderModeConfigurationRepository =
      new RenderModeConfigurationRepository(
        this.dataSource.getRepository(
          RenderModeConfigurationSchema,
        ) as Repository<RenderModeConfiguration>,
        this.logger,
      );
    this.packageRepository = new PackageRepository(
      this.dataSource.getRepository(PackageSchema) as Repository<Package>,
      this.logger,
    );
  }

  getTargetRepository(): ITargetRepository {
    return this.targetRepository;
  }

  getRecipesDeploymentRepository(): IRecipesDeploymentRepository {
    return this.recipesDeploymentRepository;
  }

  getStandardsDeploymentRepository(): IStandardsDeploymentRepository {
    return this.standardsDeploymentRepository;
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
}
