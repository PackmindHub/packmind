import { IBaseAdapter } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  ICodingAgentDeployerRegistry,
  ICodingAgentPort,
  IGitPort,
  IGitPortName,
  IStandardsPort,
  IStandardsPortName,
  PrepareRecipesDeploymentCommand,
  PrepareRecipesDeploymentResponse,
  PrepareStandardsDeploymentCommand,
  PrepareStandardsDeploymentResponse,
} from '@packmind/types';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { PrepareRecipesDeploymentUseCase } from '../useCases/PrepareRecipesDeploymentUseCase';
import { PrepareStandardsDeploymentUseCase } from '../useCases/PrepareStandardsDeploymentUseCase';

const origin = 'CodingAgentAdapter';

export class CodingAgentAdapter
  implements IBaseAdapter<ICodingAgentPort>, ICodingAgentPort
{
  private standardsPort!: IStandardsPort;
  private gitPort!: IGitPort;
  private codingAgentServices!: CodingAgentServices;
  private codingAgentRepositories!: ICodingAgentRepositories;

  private _prepareRecipesDeploymentUseCase!: PrepareRecipesDeploymentUseCase;
  private _prepareStandardsDeploymentUseCase!: PrepareStandardsDeploymentUseCase;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info(
      'CodingAgentAdapter constructed - awaiting initialization',
    );
  }

  /**
   * Initialize adapter with ports and services from registry.
   * All ports in signature are REQUIRED.
   * Services are provided by Hexa after recreating with ports.
   */
  public initialize(params: {
    ports: {
      [IStandardsPortName]: IStandardsPort;
      [IGitPortName]: IGitPort;
    };
    services: CodingAgentServices;
    repositories: ICodingAgentRepositories;
  }): void {
    this.logger.info('Initializing CodingAgentAdapter with ports and services');

    // Step 1: Set all ports
    this.standardsPort = params.ports[IStandardsPortName];
    this.gitPort = params.ports[IGitPortName];
    this.codingAgentServices = params.services;
    this.codingAgentRepositories = params.repositories;

    // Step 2: Validate all required dependencies are set
    if (!this.isReady()) {
      throw new Error(
        'CodingAgentAdapter: Required ports/services not provided',
      );
    }

    // Step 3: Create all use cases with non-null dependencies
    this._prepareRecipesDeploymentUseCase = new PrepareRecipesDeploymentUseCase(
      this.codingAgentServices,
      this.logger,
    );

    this._prepareStandardsDeploymentUseCase =
      new PrepareStandardsDeploymentUseCase(
        this.codingAgentServices,
        this.logger,
      );

    this.logger.info('CodingAgentAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required ports and services are set).
   */
  public isReady(): boolean {
    return (
      this.standardsPort !== undefined &&
      this.gitPort !== undefined &&
      this.codingAgentServices !== undefined &&
      this.codingAgentRepositories !== undefined
    );
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ICodingAgentPort {
    return this as ICodingAgentPort;
  }

  async prepareRecipesDeployment(
    command: PrepareRecipesDeploymentCommand,
  ): Promise<PrepareRecipesDeploymentResponse> {
    return this._prepareRecipesDeploymentUseCase.execute(command);
  }

  async prepareStandardsDeployment(
    command: PrepareStandardsDeploymentCommand,
  ): Promise<PrepareStandardsDeploymentResponse> {
    return this._prepareStandardsDeploymentUseCase.execute(command);
  }

  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.codingAgentRepositories.getDeployerRegistry();
  }
}
