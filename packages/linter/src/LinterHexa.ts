import { AccountsHexa } from '@packmind/accounts';
import { GitHexa } from '@packmind/git';
import { JobsHexa } from '@packmind/jobs';
import { LinterAstAdapter } from '@packmind/linter-ast';
import { ExecuteLinterProgramsUseCase } from '@packmind/linter-execution';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import type {
  IDeploymentPort,
  IGitPort,
  ILinterPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import { LinterAdapter } from './application/LinterAdapter';
import { LinterHexaFactory } from './LinterHexaFactory';

const origin = 'LinterHexa';

/**
 * LinterHexa - Facade for the Linter domain following the Hexa pattern.
 *
 * This class serves as the main entry point for linter functionality.
 * It handles the generation of detection programs for rules within standards.
 *
 * The Hexa pattern separates concerns:
 * - LinterHexaFactory: Handles dependency injection and service instantiation
 * - LinterHexa: Serves as use case facade and integration point with other domains
 */
export class LinterHexa extends BaseHexa {
  private readonly hexa: LinterHexaFactory;
  private linterAdapter?: LinterAdapter; // Will be set in initialize()
  private readonly gitPort: IGitPort;
  private standardsPort?: IStandardsPort;
  private deploymentsPort?: IDeploymentPort;
  private spacesPort?: ISpacesPort;
  private isInitialized = false;

  constructor(
    registry: HexaRegistry,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(registry, opts);

    this.logger.info('Constructing LinterHexa');

    try {
      const dataSource = registry.getDataSource();

      const gitHexa = registry.get(GitHexa);
      if (!gitHexa) {
        throw new Error('GitHexa not found in registry');
      }
      this.gitPort = gitHexa.getGitAdapter();

      // Initialize the hexagon factory
      this.hexa = new LinterHexaFactory(dataSource, registry, this.logger);

      this.logger.info('LinterHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct LinterHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - must be called after construction.
   * This initializes delayed jobs and async dependencies.
   */
  public override async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.debug('LinterHexa already initialized');
      return;
    }

    this.logger.info('Initializing LinterHexa (async phase)');

    try {
      // Initialize linter-ast adapter
      try {
        const linterAstAdapter = new LinterAstAdapter();
        this.hexa.setLinterAstAdapter(linterAstAdapter);
        this.logger.info('LinterAstAdapter initialized successfully', {
          adapter: linterAstAdapter ? 'present' : 'null',
          availableLanguages: linterAstAdapter?.getAvailableLanguages?.() || [],
        });
      } catch (error) {
        this.logger.error(
          'Failed to initialize LinterAstAdapter - will fall back to js-playground',
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
      }

      // Initialize the hexa factory with standards adapter getter
      const linterDelayedJobs = await this.hexa.initialize(
        () => this.getStandardsAdapter(),
        () => this.getLinterAdapter(),
      );

      // Create ExecuteLinterProgramsUseCase
      const linterAstAdapter = this.hexa.getLinterAstAdapter();
      const executeLinterProgramsUseCase = new ExecuteLinterProgramsUseCase(
        linterAstAdapter || undefined,
      );

      // Get providers from AccountsHexa
      // TODO: migrate with port/adapters
      const accountsHexa = this.registry.get(AccountsHexa);
      if (!accountsHexa) {
        throw new Error('AccountsHexa not found in registry');
      }

      const userProvider = accountsHexa.getUserProvider();
      const organizationProvider = accountsHexa.getOrganizationProvider();

      // Create linter adapter with real implementation
      this.linterAdapter = new LinterAdapter({
        hexaFactory: this.hexa,
        gitPort: this.gitPort,
        linterDelayedJobs,
        executeLinterProgramsUseCase,
        userProvider,
        organizationProvider,
        standardsAdapter: this.standardsPort,
        deploymentsAdapter: this.deploymentsPort,
        spacesAdapter: this.spacesPort,
      });

      this.isInitialized = true;
      this.logger.info('LinterHexa initialized successfully');

      // Start the job workers
      await this.initializeJobQueues();
    } catch (error) {
      this.logger.error('Failed to initialize LinterHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize job queues - starts the workers for processing delayed jobs.
   * This is automatically called during the async initialization phase.
   */
  public async initializeJobQueues(): Promise<void> {
    this.logger.info('Initializing job queues for LinterHexa');

    try {
      // Get JobsHexa from registry and initialize all queues
      // TODO: migrate with port/adapters
      const jobsHexa = this.registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      await jobsHexa.initJobQueues();

      this.logger.info('Job queues initialized successfully for LinterHexa');
    } catch (error) {
      this.logger.error('Failed to initialize job queues for LinterHexa', {
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
        'LinterHexa not initialized. Call initialize() before using.',
      );
    }
  }

  /**
   * Destroys the LinterHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying LinterHexa');
    // Add any cleanup logic here if needed
    this.logger.info('LinterHexa destroyed');
  }

  public getLinterAdapter(): ILinterPort {
    this.ensureInitialized();
    if (!this.linterAdapter) {
      throw new Error('LinterAdapter not initialized');
    }
    return this.linterAdapter;
  }

  public setDeploymentPort(deploymentPort: IDeploymentPort): void {
    this.deploymentsPort = deploymentPort;
    if (this.linterAdapter) {
      this.linterAdapter.setDeploymentPort(deploymentPort);
    }
  }

  public setStandardAdapter(standardPort: IStandardsPort): void {
    this.standardsPort = standardPort;
    if (this.linterAdapter) {
      this.linterAdapter.setStandardsPort(standardPort);
    }
  }

  public setSpacesAdapter(spacesPort: ISpacesPort): void {
    this.spacesPort = spacesPort;
    if (this.linterAdapter) {
      this.linterAdapter.setSpacesPort(spacesPort);
    }
  }

  private getStandardsAdapter(): IStandardsPort {
    if (!this.standardsPort) {
      throw new Error(
        'Standards adapter not configured for LinterHexa initialization',
      );
    }
    return this.standardsPort;
  }
}
