import { PackmindLogger } from '@packmind/logger';
import { IGitPort } from '@packmind/types';
import { DataSource } from 'typeorm';
import { IDeploymentsServices } from './application/IDeploymentsServices';
import { DeploymentsServices } from './application/services/DeploymentsServices';
import { DeploymentsRepositories } from './infra/repositories/DeploymentsRepositories';

export class DeploymentsHexaFactory {
  public readonly repositories: DeploymentsRepositories;

  public services: {
    git: IGitPort;
    deployments: IDeploymentsServices;
  };

  constructor(
    logger: PackmindLogger,
    dataSource: DataSource,
    gitPort?: IGitPort,
  ) {
    // Initialize repositories aggregator
    this.repositories = new DeploymentsRepositories(dataSource, logger);

    // Initialize services
    // gitPort may be undefined during construction, will be set during initialization
    // Create a temporary stub if gitPort is not provided
    const tempGitPort = gitPort || ({} as IGitPort);
    this.services = {
      git: tempGitPort,
      deployments: new DeploymentsServices(
        this.repositories,
        tempGitPort,
        logger,
      ),
    };
  }
}
