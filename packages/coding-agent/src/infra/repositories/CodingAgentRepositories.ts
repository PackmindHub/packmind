import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { CodingAgentDeployerRegistry } from './CodingAgentDeployerRegistry';
import { instrumentComponents } from '@packmind/node-utils';
import { IStandardsPort, IGitPort } from '@packmind/types';

/**
 * CodingAgentRepositories - Repository aggregator implementation for the CodingAgent domain
 *
 * This class serves as the main repository access point, aggregating all
 * individual repositories. It handles the instantiation of repositories
 * and provides them through getter methods.
 */
export class CodingAgentRepositories implements ICodingAgentRepositories {
  private readonly deployerRegistry: ICodingAgentDeployerRegistry;

  constructor(standardsPort?: IStandardsPort, gitPort?: IGitPort) {
    // Initialize the deployer registry
    this.deployerRegistry = new CodingAgentDeployerRegistry(
      standardsPort,
      gitPort,
    );

    // Covers the repositories that do not extend AbstractRepository, which
    // instruments itself. An explicit list rather than reflection over the
    // fields: this class also holds a TypeORM DataSource, which must not be
    // patched.
    instrumentComponents([this.deployerRegistry]);
  }

  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.deployerRegistry;
  }
}
