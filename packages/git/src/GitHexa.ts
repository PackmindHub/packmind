import { AccountsHexa } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IDeploymentPort,
  IDeploymentPortName,
  IGitPort,
  IGitPortName,
  OrganizationProvider,
  UserProvider,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { FetchFileContentCallback } from './application/jobs/FetchFileContentDelayedJob';
import { FetchFileContentInput } from './domain/jobs/FetchFileContent';
import { IGitRepoFactory } from './domain/repositories/IGitRepoFactory';
import { GitHexaFactory } from './GitHexaFactory';

const origin = 'GitHexa';

/**
 * GitHexa - Facade for the Git domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for git-related functionality.
 * It holds the GitHexa instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - GitHexaFactory: Handles dependency injection and service instantiation
 * - GitHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */

export type GitHexaOpts = BaseHexaOpts & {
  gitRepoFactory?: IGitRepoFactory;
};

const BaseGitHexaOpts: GitHexaOpts = { logger: new PackmindLogger(origin) };

export class GitHexa extends BaseHexa<GitHexaOpts, IGitPort> {
  private readonly hexa: GitHexaFactory;
  private isInitialized = false;

  constructor(dataSource: DataSource, opts?: Partial<GitHexaOpts>) {
    super(dataSource, { ...BaseGitHexaOpts, ...opts });
    this.logger.info('Constructing GitHexa');

    try {
      // Initialize the hexagon factory with the DataSource
      // Adapter retrieval will be done in initialize(registry)
      this.hexa = new GitHexaFactory(this.dataSource, {
        ...BaseGitHexaOpts,
        ...opts,
      });
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
      // Get AccountsHexa to retrieve user and organization providers
      try {
        const accountsHexa = registry.get(AccountsHexa);
        const userProvider = accountsHexa.getUserProvider();
        const organizationProvider = accountsHexa.getOrganizationProvider();
        this.setUserProvider(userProvider);
        this.setOrganizationProvider(organizationProvider);
      } catch {
        // AccountsHexa not available - optional dependency
        this.logger.debug('AccountsHexa not available in registry');
      }

      // Get DeploymentsHexa to retrieve deployments adapter
      // Using getAdapter to avoid circular dependency (DeploymentsHexa imports GitHexa)
      try {
        const deploymentPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
        this.setDeploymentsAdapter(deploymentPort);
      } catch {
        // DeploymentsHexa not available - optional dependency
        this.logger.debug('DeploymentsHexa not available in registry');
      }

      await this.hexa.initialize(registry);
      this.isInitialized = true;
      this.logger.info('GitHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize GitHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    return this.hexa.getGitDelayedJobs();
  }

  /**
   * Set the deployments adapter for creating default targets
   */
  public setDeploymentsAdapter(adapter: IDeploymentPort): void {
    this.hexa.setDeploymentsAdapter(adapter);
  }

  /**
   * Get the Git adapter for cross-domain access to git data.
   * This adapter implements IGitPort and can be injected into other domains.
   * The adapter is available immediately after construction (doesn't require initialization).
   */
  public getAdapter(): IGitPort {
    return this.hexa.useCases;
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
   * Configure the admin user provider used for access validation
   */
  public setUserProvider(provider: UserProvider): void {
    this.hexa.useCases.setUserProvider(provider);
  }

  /**
   * Configure the organization provider used for access validation
   */
  public setOrganizationProvider(provider: OrganizationProvider): void {
    this.hexa.useCases.setOrganizationProvider(provider);
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
    const delayedJobs = this.hexa.getGitDelayedJobs();
    return delayedJobs.fetchFileContentDelayedJob.addJobWithCallback(
      input,
      onComplete,
    );
  }
}
