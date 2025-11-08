import { GitServices } from './application/GitServices';
import { GitRepositories } from './infra/repositories/GitRepositories';
import { DataSource } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import { IDeploymentPort } from '@packmind/types';

// Adapter imports
import { GitAdapter } from './application/adapter/GitAdapter';
import { GitHexaOpts } from './GitHexa';
import { IGitDelayedJobs } from './domain/jobs/IGitDelayedJobs';
import { FetchFileContentJobFactory } from './infra/jobs/FetchFileContentJobFactory';
import { JobsHexa } from '@packmind/jobs';

const origin = 'GitHexa';

export class GitHexaFactory {
  private readonly gitRepositories: GitRepositories;
  private readonly gitServices: GitServices;
  private readonly logger: PackmindLogger;
  // Adapter
  public useCases!: GitAdapter;
  private gitDelayedJobs?: IGitDelayedJobs;
  private isInitialized = false;

  constructor(
    private readonly dataSource: DataSource,
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

      // Create adapter in constructor so it's available immediately
      // (adapter doesn't need delayed jobs - those are only used by GitHexa methods)
      this.logger.debug('Creating GitAdapter');
      this.useCases = new GitAdapter(this.gitServices, this.logger);
      this.logger.debug('GitAdapter created successfully');

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
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('GitHexaFactory already initialized');
      return;
    }

    this.logger.info('Initializing GitHexaFactory (async phase)');

    try {
      // TODO: migrate with port/adapters
      const jobsHexa = registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      this.logger.debug('Building git delayed jobs');
      this.gitDelayedJobs = await this.buildGitDelayedJobs(jobsHexa);

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
