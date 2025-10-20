import { GitServices } from './application/GitServices';
import { GitRepositories } from './infra/repositories/GitRepositories';
import { DataSource } from 'typeorm';
import {
  PackmindLogger,
  IDeploymentPort,
  HexaRegistry,
} from '@packmind/shared';

// Use cases imports
import { GitUseCases } from './application/useCases/GitUseCases';
import { GitHexaOpts } from './GitHexa';
import { IGitDelayedJobs } from './domain/jobs/IGitDelayedJobs';
import { FetchFileContentJobFactory } from './infra/jobs/FetchFileContentJobFactory';
import { JobsHexa } from '@packmind/jobs';

const origin = 'GitHexa';

export class GitHexaFactory {
  private readonly gitRepositories: GitRepositories;
  private readonly gitServices: GitServices;
  private readonly logger: PackmindLogger;
  private readonly registry: HexaRegistry;
  // Use cases
  public useCases!: GitUseCases;
  private gitDelayedJobs?: IGitDelayedJobs;
  private isInitialized = false;

  constructor(
    private readonly dataSource: DataSource,
    registry: HexaRegistry,
    private readonly opts: GitHexaOpts = { logger: new PackmindLogger(origin) },
  ) {
    this.logger = opts.logger;
    this.logger.info('Constructing GitHexaFactory');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.gitRepositories = new GitRepositories(this.dataSource, this.opts);
      this.gitServices = new GitServices(this.gitRepositories, this.logger);
      this.registry = registry;

      this.logger.info('GitHexaFactory construction completed');
    } catch (error) {
      this.logger.error('Failed to construct GitHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - must be called after construction
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('GitHexaFactory already initialized');
      return;
    }

    this.logger.info('Initializing GitHexaFactory (async phase)');

    try {
      const jobsHexa = this.registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      this.logger.debug('Building git delayed jobs');
      this.gitDelayedJobs = await this.buildGitDelayedJobs(jobsHexa);

      // Initialize use cases
      this.logger.debug('Creating GitUseCases');
      this.useCases = new GitUseCases(this.gitServices, this.logger);
      this.logger.debug('GitUseCases created successfully');

      this.isInitialized = true;
      this.logger.info('GitHexaFactory initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async buildGitDelayedJobs(
    jobsHexa: JobsHexa,
  ): Promise<IGitDelayedJobs> {
    // Register our job queue with JobsHexa
    const fetchFileContentJobFactory = new FetchFileContentJobFactory(
      this.gitServices.getGitRepoService(),
      this.gitServices.getGitProviderService(),
      this.opts.gitRepoFactory || this.gitRepositories.getGitRepoFactory(),
      this.logger,
    );

    jobsHexa.registerJobQueue(
      fetchFileContentJobFactory.getQueueName(),
      fetchFileContentJobFactory,
    );

    await fetchFileContentJobFactory.createQueue();

    if (!fetchFileContentJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for FetchFileContent');
    }

    this.logger.debug('Git delayed jobs built successfully');
    return {
      fetchFileContentDelayedJob: fetchFileContentJobFactory.delayedJob,
    };
  }

  public getGitDelayedJobs(): IGitDelayedJobs {
    if (!this.gitDelayedJobs) {
      throw new Error(
        'GitHexaFactory not initialized. Call initialize() before using.',
      );
    }
    return this.gitDelayedJobs;
  }

  /**
   * Set the deployments adapter for creating default targets
   */
  public setDeploymentsAdapter(adapter: IDeploymentPort): void {
    this.useCases.setDeploymentsAdapter(adapter);
  }
}
