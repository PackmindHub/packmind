import { GitServices } from './application/GitServices';
import { GitRepositories } from './infra/repositories/GitRepositories';
import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/shared';

// Use cases imports
import { GitUseCases } from './application/useCases/GitUseCases';

const origin = 'GitHexa';

export class GitHexaFactory {
  private readonly gitRepositories: GitRepositories;
  private readonly gitServices: GitServices;

  // Use cases
  public readonly useCases: GitUseCases;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Initializing GitHexaFactory');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.gitRepositories = new GitRepositories(this.dataSource);
      this.gitServices = new GitServices(this.gitRepositories, this.logger);

      // Initialize use cases
      this.logger.debug('Creating GitUseCases');
      this.useCases = new GitUseCases(this.gitServices, this.logger);
      this.logger.debug('GitUseCases created successfully');

      this.logger.info('GitHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
