import { StandardsServices } from './application/services/StandardsServices';
import { StandardsRepositories } from './infra/repositories/StandardsRepositories';
import { DataSource } from 'typeorm';
import { StandardsUseCases } from './application/useCases';
import {
  HexaRegistry,
  PackmindLogger,
  IDeploymentPort,
} from '@packmind/shared';
import { GitHexa } from '@packmind/git';

const origin = 'StandardsHexa';

export class StandardsHexaFactory {
  private readonly standardsRepositories: StandardsRepositories;
  private readonly standardsServices: StandardsServices;
  private readonly gitHexa: GitHexa;
  public readonly useCases: StandardsUseCases;
  private readonly registry: HexaRegistry;
  private deploymentsQueryAdapter?: IDeploymentPort;

  constructor(
    dataSource: DataSource,
    gitHexa: GitHexa,
    registry: HexaRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    deploymentsQueryAdapter?: IDeploymentPort,
  ) {
    this.logger.info('Initializing StandardsHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.standardsRepositories = new StandardsRepositories(dataSource);
      this.standardsServices = new StandardsServices(
        this.standardsRepositories,
        this.logger,
      );

      this.logger.debug('Storing GitHexa reference');
      this.gitHexa = gitHexa;

      this.logger.debug('Creating StandardsUseCases');

      this.registry = registry;
      this.deploymentsQueryAdapter = deploymentsQueryAdapter;

      this.useCases = new StandardsUseCases(
        this.standardsServices,
        this.standardsRepositories,
        this.gitHexa,
        this.deploymentsQueryAdapter,
        this.logger,
      );

      this.logger.info('StandardsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize StandardsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set the deployments query adapter (for runtime wiring)
   */
  public setDeploymentsQueryAdapter(adapter: IDeploymentPort): void {
    this.deploymentsQueryAdapter = adapter;
    // Update use cases with new adapter
    this.useCases.setDeploymentsQueryAdapter(adapter);
  }

  getStandardsServices(): StandardsServices {
    return this.standardsServices;
  }

  getStandardsRepositories(): StandardsRepositories {
    return this.standardsRepositories;
  }
}
