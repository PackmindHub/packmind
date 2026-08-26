import { TargetService } from './TargetService';
import { RenderModeConfigurationService } from './RenderModeConfigurationService';
import { PackageService } from './PackageService';
import { instrumentComponents } from '@packmind/node-utils';
import { IDeploymentsRepositories } from '../../domain/repositories/IDeploymentsRepositories';

/**
 * DeploymentsServices - Service aggregator for the Deployments application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 */
export class DeploymentsServices {
  private readonly targetService: TargetService;
  private readonly renderModeConfigurationService: RenderModeConfigurationService;
  private readonly packageService: PackageService;

  constructor(
    private readonly deploymentsRepositories: IDeploymentsRepositories,
  ) {
    // Initialize all services with their respective repositories from the aggregator
    this.targetService = new TargetService(
      this.deploymentsRepositories.getTargetRepository(),
    );
    this.renderModeConfigurationService = new RenderModeConfigurationService(
      this.deploymentsRepositories.getRenderModeConfigurationRepository(),
    );
    this.packageService = new PackageService(
      this.deploymentsRepositories.getPackageRepository(),
    );

    // Services are where the domain logic that is not a query lives, and they
    // have no shared base class to hook - so the aggregator is the seam.
    instrumentComponents([
      this.targetService,
      this.renderModeConfigurationService,
      this.packageService,
    ]);
  }

  getRepositories(): IDeploymentsRepositories {
    return this.deploymentsRepositories;
  }

  getTargetService(): TargetService {
    return this.targetService;
  }

  getRenderModeConfigurationService(): RenderModeConfigurationService {
    return this.renderModeConfigurationService;
  }

  getPackageService(): PackageService {
    return this.packageService;
  }
}
