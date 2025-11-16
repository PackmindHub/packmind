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
  RenderArtifactsCommand,
  RenderArtifactsResponse,
} from '@packmind/types';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { CodingAgentServices } from '../services/CodingAgentServices';
import { PrepareRecipesDeploymentUseCase } from '../useCases/PrepareRecipesDeploymentUseCase';
import { PrepareStandardsDeploymentUseCase } from '../useCases/PrepareStandardsDeploymentUseCase';
import { RenderArtifactsUseCase } from '../useCases/RenderArtifactsUseCase';

const origin = 'CodingAgentAdapter';

export class CodingAgentAdapter
  implements IBaseAdapter<ICodingAgentPort>, ICodingAgentPort
{
  private standardsPort: IStandardsPort | null = null;
  private gitPort: IGitPort | null = null;

  private _prepareRecipesDeploymentUseCase!: PrepareRecipesDeploymentUseCase;
  private _prepareStandardsDeploymentUseCase!: PrepareStandardsDeploymentUseCase;
  private _renderArtifactsUseCase!: RenderArtifactsUseCase;

  constructor(
    private readonly codingAgentRepositories: ICodingAgentRepositories,
    private readonly codingAgentServices: CodingAgentServices,
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
  public async initialize(ports: {
    [IStandardsPortName]: IStandardsPort;
    [IGitPortName]: IGitPort;
  }): Promise<void> {
    this.logger.info('Initializing CodingAgentAdapter with ports and services');

    // Step 1: Set all ports
    this.standardsPort = ports[IStandardsPortName];
    this.gitPort = ports[IGitPortName];

    // Step 2: Validate all required dependencies are set
    if (!this.standardsPort || !this.gitPort) {
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

    this._renderArtifactsUseCase = new RenderArtifactsUseCase(
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
      this.standardsPort != null &&
      this.gitPort != null &&
      this.codingAgentServices != null &&
      this.codingAgentRepositories != null
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

  async renderArtifacts(
    command: RenderArtifactsCommand,
  ): Promise<RenderArtifactsResponse> {
    return this._renderArtifactsUseCase.execute(command);
  }

  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.codingAgentRepositories.getDeployerRegistry();
  }
}
