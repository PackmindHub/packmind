import { JobsService, PackmindEventEmitterService } from '@packmind/node-utils';
import { LinterAstAdapter } from '@packmind/linter-ast';
import { ExecuteLinterProgramsUseCase } from '@packmind/linter-execution';
import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IDeploymentPort,
  IDeploymentPortName,
  IEventTrackingPort,
  IEventTrackingPortName,
  IGitPort,
  IGitPortName,
  ILinterAstPort,
  ILinterPort,
  ILinterPortName,
  ILlmPort,
  ILlmPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { LinterAdapter } from './application/adapter/LinterAdapter';
import { LinterListener } from './application/listeners/LinterListener';
import { DetectionProgramService } from './application/services/DetectionProgramService';
import { ILinterDelayedJobs } from './application/jobs/ILinterDelayedJobs';
import { AssessRuleDetectionJobFactory } from './infra/AssessRuleDetectionJobFactory';
import { GenerateProgramJobFactory } from './infra/GenerateProgramJobFactory';
import { MoveLinterArtefactsJobFactory } from './infra/MoveLinterArtefactsJobFactory';
import { LinterRepositories } from './infra/repositories/LinterRepositories';

const origin = 'LinterHexa';

/**
 * LinterHexa - Facade for the Linter domain following hexagonal architecture.
 *
 * This class serves as the main entry point for linter-related functionality.
 * It handles the generation of detection programs for rules within standards.
 *
 * The constructor instantiates repositories, services, and adapter (but not initialized).
 * The initialize method retrieves ports from registry, initializes delayed jobs, and completes async setup.
 *
 * Note: JobsHexa can be referenced directly (infrastructure, no port exposed) - only for delayed job access.
 */
export type LinterHexaOpts = BaseHexaOpts;

const baseLinterHexaOpts = { logger: new PackmindLogger(origin) };

export class LinterHexa extends BaseHexa<LinterHexaOpts, ILinterPort> {
  private readonly linterRepositories: LinterRepositories;
  private readonly detectionProgramService: DetectionProgramService;
  private readonly adapter: LinterAdapter;
  private readonly linterListener: LinterListener;
  private linterAstAdapter: ILinterAstPort | null = null;
  private standardsPort: IStandardsPort | null = null;

  constructor(dataSource: DataSource, opts?: Partial<LinterHexaOpts>) {
    super(dataSource, { ...baseLinterHexaOpts, ...opts });
    this.logger.info('Constructing LinterHexa');

    try {
      this.logger.debug(
        'Creating repository and service aggregators with DataSource',
      );

      // Instantiate repositories
      this.linterRepositories = new LinterRepositories(this.dataSource);

      // Instantiate services
      this.detectionProgramService = new DetectionProgramService(
        this.linterRepositories,
      );

      // Initialize linter-ast adapter early
      try {
        this.linterAstAdapter = new LinterAstAdapter();
        this.logger.info('LinterAstAdapter initialized successfully', {
          adapter: this.linterAstAdapter ? 'present' : 'null',
          availableLanguages:
            this.linterAstAdapter?.getAvailableLanguages?.() || [],
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

      // Create ExecuteLinterProgramsUseCase
      const executeLinterProgramsUseCase = new ExecuteLinterProgramsUseCase(
        this.linterAstAdapter || undefined,
      );

      // Create adapter with minimal dependencies (ports will be set in initialize)
      const hexaFactory: {
        getDetectionProgramService(): DetectionProgramService;
        getRepositories(): LinterRepositories;
      } = {
        getDetectionProgramService: () => this.detectionProgramService,
        getRepositories: () => this.linterRepositories,
      };

      // Create adapter in constructor (ports will be set in initialize)
      this.adapter = new LinterAdapter({
        hexaFactory,
        executeLinterProgramsUseCase,
      });

      this.linterListener = new LinterListener(this.adapter.getPort());

      this.logger.debug(
        'Repository aggregator, service aggregator, and adapter created successfully',
      );

      this.logger.info('LinterHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct LinterHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - retrieves ports and initializes delayed jobs.
   * Called by HexaRegistry after all hexas are constructed.
   */
  async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing LinterHexa (adapter retrieval phase)');

    try {
      // Get all required ports - let errors propagate
      const gitPort = registry.getAdapter<IGitPort>(IGitPortName);
      this.logger.debug('Retrieved GitAdapter from registry');

      this.standardsPort =
        registry.getAdapter<IStandardsPort>(IStandardsPortName);
      const standardsPort = this.standardsPort;
      this.logger.debug('Retrieved StandardsAdapter from registry');

      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      this.logger.debug('Retrieved AccountsAdapter from registry');

      // Get optional ports
      let deploymentsPort: IDeploymentPort | undefined;
      try {
        deploymentsPort =
          registry.getAdapter<IDeploymentPort>(IDeploymentPortName);
        this.logger.debug('Retrieved DeploymentsAdapter from registry');
      } catch (error) {
        this.logger.debug('DeploymentsHexa not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      let spacesPort: ISpacesPort | undefined;
      try {
        spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
        this.logger.debug('Retrieved SpacesAdapter from registry');
      } catch (error) {
        this.logger.debug('SpacesHexa not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      let eventTrackingPort: IEventTrackingPort | null = null;
      try {
        eventTrackingPort = registry.getAdapter<IEventTrackingPort>(
          IEventTrackingPortName,
        );
        this.logger.debug('Retrieved EventTrackingAdapter from registry');
      } catch (error) {
        this.logger.debug('EventTrackingPort not available in registry', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Get llm port (required for AI features)
      const llmPort = registry.getAdapter<ILlmPort>(ILlmPortName);
      this.logger.debug('Retrieved LlmAdapter from registry');

      // Get JobsHexa (required) for delayed job registration
      const jobsService = registry.getService(JobsService);
      if (!jobsService) {
        throw new Error('JobsHexa not found in registry');
      }

      // Get PackmindEventEmitterService (required) - for domain event emission
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      // Build delayed jobs
      this.logger.debug('Building linter delayed jobs');
      const linterDelayedJobs = await this.buildLinterDelayedJobs(
        jobsService,
        () => standardsPort,
        () => this.getAdapter(),
        () => llmPort,
      );

      // Initialize adapter once with all ports and delayed jobs
      this.logger.debug('Initializing LinterAdapter with all ports');
      await this.adapter.initialize({
        [IGitPortName]: gitPort,
        [IStandardsPortName]: standardsPort,
        [IAccountsPortName]: accountsPort,
        [IDeploymentPortName]: deploymentsPort,
        [ISpacesPortName]: spacesPort,
        [IEventTrackingPortName]: eventTrackingPort,
        llmPort,
        linterAstPort: this.linterAstAdapter,
        linterDelayedJobs,
        eventEmitterService,
      });

      this.linterListener.initialize(eventEmitterService);

      this.logger.info('LinterHexa initialized successfully');

      // Start the job workers
      await this.initializeJobQueues(jobsService);
    } catch (error) {
      this.logger.error('Failed to initialize LinterHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Build delayed jobs for linter operations
   */
  private async buildLinterDelayedJobs(
    jobsService: JobsService,
    getStandardsAdapter: () => IStandardsPort,
    getLinterAdapter: () => ILinterPort,
    getLlmPort: () => ILlmPort,
  ): Promise<ILinterDelayedJobs> {
    // Register generate program job queue with JobsService
    const generateProgramJobFactory = new GenerateProgramJobFactory(
      this.linterRepositories,
      getStandardsAdapter,
      () => this.linterAstAdapter,
      getLinterAdapter,
      getLlmPort,
    );

    jobsService.registerJobQueue(
      generateProgramJobFactory.getQueueName(),
      generateProgramJobFactory,
    );

    await generateProgramJobFactory.createQueue();

    if (!generateProgramJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for GenerateProgramJobFactory');
    }

    // Register assess rule detection job queue with JobsService
    const assessRuleDetectionJobFactory = new AssessRuleDetectionJobFactory(
      this.linterRepositories,
      getStandardsAdapter,
      getLinterAdapter,
      getLlmPort,
    );

    jobsService.registerJobQueue(
      assessRuleDetectionJobFactory.getQueueName(),
      assessRuleDetectionJobFactory,
    );

    await assessRuleDetectionJobFactory.createQueue();

    if (!assessRuleDetectionJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for AssessRuleDetectionJobFactory');
    }

    // Register move linter artefacts job queue with JobsService
    const moveLinterArtefactsJobFactory = new MoveLinterArtefactsJobFactory(
      this.linterRepositories,
      getLinterAdapter,
    );

    jobsService.registerJobQueue(
      moveLinterArtefactsJobFactory.getQueueName(),
      moveLinterArtefactsJobFactory,
    );

    await moveLinterArtefactsJobFactory.createQueue();

    if (!moveLinterArtefactsJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for MoveLinterArtefactsJobFactory');
    }

    return {
      generateProgramDelayedJob: generateProgramJobFactory.delayedJob,
      assessRuleDetectionDelayedJob: assessRuleDetectionJobFactory.delayedJob,
      moveLinterArtefactsDelayedJob: moveLinterArtefactsJobFactory.delayedJob,
    };
  }

  /**
   * Initialize job queues - starts the workers for processing delayed jobs.
   * This is automatically called during the async initialization phase.
   */
  private async initializeJobQueues(jobsService: JobsService): Promise<void> {
    this.logger.info('Initializing job queues for LinterHexa');

    try {
      await jobsService.initJobQueues();
      this.logger.info('Job queues initialized successfully for LinterHexa');
    } catch (error) {
      this.logger.error('Failed to initialize job queues for LinterHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying LinterHexa');
    // Add any cleanup logic here if needed
    this.logger.info('LinterHexa destroyed');
  }

  /**
   * Get the Linter adapter for cross-domain access.
   * This adapter implements ILinterPort and can be injected into other domains.
   * The adapter is created during construction, and ports are set during initialization.
   */
  public getAdapter(): ILinterPort {
    return this.adapter.getPort();
  }

  /**
   * Get the port name constant for registry mapping.
   * Used by HexaRegistry to build the port-to-hexa map.
   */
  public getPortName(): string {
    return ILinterPortName;
  }

  /**
   * Get the Standards port for accessing rule data.
   * This is used by the service layer to fetch rules when starting assessments.
   */
  public getStandardsPort(): IStandardsPort {
    if (!this.standardsPort) {
      throw new Error(
        'StandardsPort not initialized. Call initialize() first.',
      );
    }
    return this.standardsPort;
  }
}
