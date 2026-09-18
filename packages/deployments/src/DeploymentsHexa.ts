import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  JobsService,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ICodingAgentPort,
  ICodingAgentPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  ICommandsPort,
  ICommandsPortName,
  ISkillsPort,
  ISkillsPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DeploymentsAdapter } from './application/adapter/DeploymentsAdapter';
import { DeploymentsListener } from './application/listeners/DeploymentsListener';
import { DeploymentsServices } from './application/services/DeploymentsServices';
import { DeploymentsRepositories } from './infra/repositories/DeploymentsRepositories';

const origin = 'DeploymentsHexa';

export type DeploymentsHexaOpts = BaseHexaOpts;

/**
 * Facade for the Deployments domain: distributes commands, standards and skills
 * to git repositories, and records the distribution history.
 */
export class DeploymentsHexa extends BaseHexa<
  DeploymentsHexaOpts,
  IDeploymentPort
> {
  private readonly repositories: DeploymentsRepositories;
  private readonly services: DeploymentsServices;
  private readonly adapter: DeploymentsAdapter;
  private readonly listener: DeploymentsListener;

  constructor(
    dataSource: DataSource,
    opts: Partial<DeploymentsHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);
    this.logger.info('Constructing DeploymentsHexa');

    try {
      this.repositories = new DeploymentsRepositories(this.dataSource);

      this.services = new DeploymentsServices(this.repositories);

      // Adapter and listener are constructed bare; initialize() wires their ports.
      this.adapter = new DeploymentsAdapter(
        this.services,
        this.repositories.getDistributionRepository(),
        this.repositories.getDistributedPackageRepository(),
      );

      this.listener = new DeploymentsListener(
        this.repositories.getPackageRepository(),
      );

      this.logger.info('DeploymentsHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing DeploymentsHexa (adapter retrieval phase)');

    try {
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      const commandsPort =
        registry.getAdapter<ICommandsPort>(ICommandsPortName);
      const codingAgentPort =
        registry.getAdapter<ICodingAgentPort>(ICodingAgentPortName);
      const standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const skillsPort = registry.getAdapter<ISkillsPort>(ISkillsPortName);
      const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      const jobsService = registry.getService(JobsService);
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [ICommandsPortName]: commandsPort,
        [ICodingAgentPortName]: codingAgentPort,
        [IStandardsPortName]: standardsPort,
        [ISkillsPortName]: skillsPort,
        [ISpacesPortName]: spacesPort,
        [IAccountsPortName]: accountsPort,
        jobsService,
        eventEmitterService,
      });

      this.listener.initialize(eventEmitterService);

      this.logger.info('DeploymentsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DeploymentsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public destroy(): void {
    this.logger.info('Destroying DeploymentsHexa');
    this.logger.info('DeploymentsHexa destroyed');
  }

  public getAdapter(): IDeploymentPort {
    return this.adapter.getPort();
  }

  public getPortName(): string {
    return IDeploymentPortName;
  }
}
