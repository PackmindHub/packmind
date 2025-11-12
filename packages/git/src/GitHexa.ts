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
import { IGitRepoFactory } from './domain/repositories/IGitRepoFactory';
import { GitRepositories } from './infra/repositories/GitRepositories';

const origin = 'GitHexa';

/**
 * GitHexa - Facade for the Git domain following the Hexa pattern.
 *
 * This class serves as the main entry point for git-related functionality.
 * It holds the adapter and exposes use cases as a clean facade.
 *
 * The constructor instantiates repositories, services, and the adapter.
 * The initialize method retrieves ports from the registry and initializes the adapter.
 */

export type GitHexaOpts = BaseHexaOpts & {
  gitRepoFactory?: IGitRepoFactory;
};

const BaseGitHexaOpts: GitHexaOpts = { logger: new PackmindLogger(origin) };

export class GitHexa extends BaseHexa<GitHexaOpts, IGitPort> {
  private readonly gitRepositories: GitRepositories;
  private readonly gitServices: GitServices;
  private readonly adapter: GitAdapter;

  constructor(dataSource: DataSource, opts?: Partial<GitHexaOpts>) {
    super(dataSource, { ...BaseGitHexaOpts, ...opts });
    this.logger.info('Constructing GitHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      this.gitRepositories = new GitRepositories(
        this.dataSource,
        this.opts as GitHexaOpts,
      );
      this.gitServices = new GitServices(this.gitRepositories, this.logger);

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
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing GitHexa (adapter retrieval phase)');

    try {
      // Get all required ports and services
      const ports = {
        [IAccountsPortName]:
          registry.getAdapter<IAccountsPort>(IAccountsPortName),
        [IDeploymentPortName]:
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName),
        jobsService: registry.getService(JobsService),
      };

      // Initialize adapter once with all ports and services
      // This will throw if any required port/service is missing
      await this.adapter.initialize(ports);

      this.logger.info('GitHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the Git adapter for cross-domain access to git data.
   * This adapter implements IGitPort and can be injected into other domains.
   */
  public getAdapter(): IGitPort {
    return this.adapter.getPort();
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
    return this.adapter.addFetchFileContentJob(input, onComplete);
  }
}
