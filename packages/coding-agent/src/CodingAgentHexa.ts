import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  ICodingAgentPort,
  ICodingAgentPortName,
  IGitPort,
  IGitPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { CodingAgentAdapter } from './application/adapter/CodingAgentAdapter';
import { CodingAgentServices } from './application/services/CodingAgentServices';
import { DeployerService } from './application/services/DeployerService';
import { ICodingAgentRepositories } from './domain/repositories/ICodingAgentRepositories';
import { CodingAgentRepositories } from './infra/repositories/CodingAgentRepositories';

const origin = 'CodingAgentHexa';

export class CodingAgentHexa extends BaseHexa<BaseHexaOpts, ICodingAgentPort> {
  private codingAgentRepositories: ICodingAgentRepositories;
  private deployerService: DeployerService;
  private codingAgentServices: CodingAgentServices;
  private adapter: CodingAgentAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing CodingAgentHexa');

    try {
      // Ports are not available until initialize(), so everything built here
      // is rebuilt there once they are.
      this.codingAgentRepositories = new CodingAgentRepositories();

      this.deployerService = new DeployerService(this.codingAgentRepositories);

      this.codingAgentServices = new CodingAgentServices(this.deployerService);

      this.adapter = new CodingAgentAdapter(
        this.codingAgentRepositories,
        this.codingAgentServices,
      );

      this.logger.info('CodingAgentHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct CodingAgentHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing CodingAgentHexa (adapter retrieval phase)');

    try {
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);

      this.codingAgentRepositories = new CodingAgentRepositories(
        standardsPort,
        gitPort,
      );

      this.deployerService = new DeployerService(this.codingAgentRepositories);

      this.codingAgentServices = new CodingAgentServices(this.deployerService);

      await this.adapter.initialize({
        [IStandardsPortName]: standardsPort,
        [IGitPortName]: gitPort,
      });

      this.logger.info('CodingAgentHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize CodingAgentHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public destroy(): void {
    this.logger.info('Destroying CodingAgentHexa');
    this.logger.info('CodingAgentHexa destroyed');
  }

  public getDeployerService(): DeployerService {
    return this.deployerService;
  }

  public getAdapter(): ICodingAgentPort {
    return this.adapter;
  }

  public getPortName(): string {
    return ICodingAgentPortName;
  }
}
