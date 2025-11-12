import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  JobsService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { GitServices } from './application/GitServices';
import { GitAdapter } from './application/adapter/GitAdapter';
import { FetchFileContentCallback } from './application/jobs/FetchFileContentDelayedJob';
import { FetchFileContentInput } from './domain/jobs/FetchFileContent';
import { IGitDelayedJobs } from './domain/jobs/IGitDelayedJobs';
import { IGitRepoFactory } from './domain/repositories/IGitRepoFactory';
import { FetchFileContentJobFactory } from './infra/jobs/FetchFileContentJobFactory';
import { GitRepositories } from './infra/repositories/GitRepositories';

const origin = 'GitHexa';

/**
 * GitHexa - Facade for the Git domain following the Hexa pattern.
 *
 * This class serves as the main entry point for git-related functionality.
 * It holds the adapter and exposes use cases as a clean facade.
 *
 * The constructor instantiates repositories, services, and the adapter.
 * The initialize method retrieves ports from the registry and sets up delayed jobs.
 */

export type GitHexaOpts = BaseHexaOpts & {
  gitRepoFactory?: IGitRepoFactory;
};

const BaseGitHexaOpts: GitHexaOpts = { logger: new PackmindLogger(origin) };

export class GitHexa extends BaseHexa<GitHexaOpts, IGitPort> {
  private readonly gitRepositories: GitRepositories;
  private readonly gitServices: GitServices;
  public readonly adapter: GitAdapter;
  private gitDelayedJobs?: IGitDelayedJobs;
  private isInitialized = false;

  constructor(dataSource: DataSource, opts?: Partial<GitHexaOpts>) {
    super(dataSource, { ...BaseGitHexaOpts, ...opts });
    this.logger.info('Constructing GitHexa');

    try {
      // Create repository and service aggregators with DataSource
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.gitRepositories = new GitRepositories(
        this.dataSource,
        this.opts as GitHexaOpts,
      );
      this.gitServices = new GitServices(this.gitRepositories, this.logger);

      // Create adapter in constructor so it's available immediately
      // (adapter doesn't need delayed jobs - those are only used by GitHexa methods)
      this.logger.debug('Creating GitAdapter');
      this.adapter = new GitAdapter(this.gitServices, this.logger);
      this.logger.debug('GitAdapter created successfully');

      this.logger.info('GitHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   * This also handles async initialization (delayed jobs, etc.).
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('GitHexa already initialized');
      return;
    }

    this.logger.info(
      'Initializing GitHexa (adapter retrieval and async phase)',
    );

    try {
      // Get Accounts port (optional)
      try {
        const accountsPort =
          registry.getAdapter<IAccountsPort>(IAccountsPortName);
        this.setAccountsAdapter(accountsPort);
      } catch {
        // AccountsHexa not available - optional dependency
        this.logger.debug('AccountsHexa not available in registry');
      }

      // Get Deployments port (optional)
      // Using getAdapter to avoid circular dependency (DeploymentsHexa imports GitHexa)
      try {
        const deploymentPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
        this.setDeploymentsAdapter(deploymentPort);
      } catch {
        // DeploymentsHexa not available - optional dependency
        this.logger.debug('DeploymentsHexa not available in registry');
      }

      // Get JobsService (required) for delayed job registration
      const jobsService = registry.getService(JobsService);
      if (!jobsService) {
        throw new Error('JobsService not found in registry');
      }

      this.logger.debug('Building git delayed jobs');
      this.gitDelayedJobs = await this.buildGitDelayedJobs(jobsService);

      // Pass delayed jobs to adapter so it can expose them through the port
      this.adapter.setGitDelayedJobs(this.gitDelayedJobs);

      this.isInitialized = true;
      this.logger.info('GitHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async buildGitDelayedJobs(
    jobsService: JobsService,
  ): Promise<IGitDelayedJobs> {
    // Register our job queue with JobsService
    const fetchFileContentJobFactory = new FetchFileContentJobFactory(
      this.gitServices.getGitRepoService(),
      this.gitServices.getGitProviderService(),
      this.opts?.gitRepoFactory || this.gitRepositories.getGitRepoFactory(),
      this.logger,
    );

    jobsService.registerJobQueue(
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

  /**
   * Internal helper to ensure initialization before use case access
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'GitHexa not initialized. Call initialize() before using.',
      );
    }
  }

  /**
   * Get the delayed jobs for accessing job queues
   */
  public getGitDelayedJobs() {
    this.ensureInitialized();
    if (!this.gitDelayedJobs) {
      throw new Error(
        'GitHexa not initialized. Call initialize() before using.',
      );
    }
    return this.gitDelayedJobs;
  }

  /**
   * Set the deployments adapter for creating default targets
   */
  public setDeploymentsAdapter(adapter: IDeploymentPort): void {
    this.adapter.setDeploymentsAdapter(adapter);
  }

  /**
   * Get the Git adapter for cross-domain access to git data.
   * This adapter implements IGitPort and can be injected into other domains.
   * The adapter is available immediately after construction (doesn't require initialization).
   */
  public getAdapter(): IGitPort {
    return this.adapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IGitPortName;
  }

  /**
   * Destroys the GitHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying GitHexa');
    // Add any cleanup logic here if needed
    this.logger.info('GitHexa destroyed');
  }

  /**
   * Configure the accounts adapter used for access validation
   */
  public setAccountsAdapter(adapter: IAccountsPort): void {
    this.adapter.setAccountsAdapter(adapter);
  }

  // ==================
  // DELAYED JOBS
  // ==================

  /**
   * Queue a job to fetch file content from a git repository.
   * This is an asynchronous operation that will fetch the file content
   * for multiple files at specific commits and return them when completed.
   *
   * Takes the output from handleWebHookWithoutContent and enriches it with file content,
   * producing the same format as handleWebHook.
   *
   * @param input - The input parameters containing the array of files from handleWebHookWithoutContent
   * @param onComplete - Optional callback to execute when the job completes successfully
   * @returns The job ID that can be used to track the job status
   *
   * @example
   * ```typescript
   * const jobId = await gitHexa.addFetchFileContentJob(
   *   {
   *     organizationId: 'org-123',
   *     gitRepoId: 'repo-456',
   *     files: filesWithoutContent,
   *   },
   *   async (result) => {
   *     console.log(`Fetched ${result.files.length} files`);
   *     // Process the files with content...
   *   }
   * );
   * ```
   */
  public async addFetchFileContentJob(
    input: FetchFileContentInput,
    onComplete?: FetchFileContentCallback,
  ): Promise<string> {
    this.ensureInitialized();
    const delayedJobs = this.getGitDelayedJobs();
    return delayedJobs.fetchFileContentDelayedJob.addJobWithCallback(
      input,
      onComplete,
    );
  }
}
