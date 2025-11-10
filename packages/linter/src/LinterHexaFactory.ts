import { JobsHexa } from '@packmind/jobs';
import { PackmindLogger } from '@packmind/logger';
import { HexaRegistry } from '@packmind/node-utils';
import type {
  ILinterAstPort,
  ILinterPort,
  IStandardsPort,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DetectionProgramService } from './application/services/DetectionProgramService';
import { ILinterDelayedJobs } from './domain/jobs/ILinterDelayedJobs';
import { ILinterRepositories } from './domain/repositories/ILinterRepositories';
import { AssessRuleDetectionJobFactory } from './infra/AssessRuleDetectionJobFactory';
import { GenerateProgramJobFactory } from './infra/GenerateProgramJobFactory';
import { LinterRepositories } from './infra/repositories/LinterRepositories';

const origin = 'LinterHexaFactory';

export class LinterHexaFactory {
  private readonly repositories: ILinterRepositories;
  private readonly detectionProgramService: DetectionProgramService;
  private readonly registry: HexaRegistry;
  private isInitialized = false;
  private linterAstAdapter: ILinterAstPort | null = null;

  constructor(
    private readonly dataSource: DataSource,
    registry: HexaRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('Constructing LinterHexaFactory');

    try {
      this.repositories = new LinterRepositories(dataSource);
      this.detectionProgramService = new DetectionProgramService(
        this.repositories,
      );
      this.registry = registry;

      this.logger.info('LinterHexaFactory construction completed');
    } catch (error) {
      this.logger.error('Failed to construct LinterHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Async initialization phase - must be called after construction
   */
  public async initialize(
    getStandardsAdapter: () => IStandardsPort,
    getLinterAdapter: () => ILinterPort,
  ): Promise<ILinterDelayedJobs> {
    if (this.isInitialized) {
      this.logger.debug('LinterHexaFactory already initialized');
      throw new Error('LinterHexaFactory already initialized');
    }

    this.logger.info('Initializing LinterHexaFactory (async phase)');

    try {
      // TODO: migrate with port/adapters
      const jobsHexa = this.registry.get(JobsHexa);
      if (!jobsHexa) {
        throw new Error('JobsHexa not found in registry');
      }

      this.logger.debug('Building linter delayed jobs');
      const linterDelayedJobs = await this.buildLinterDelayedJobs(
        jobsHexa,
        getStandardsAdapter,
        getLinterAdapter,
      );

      this.isInitialized = true;
      this.logger.info('LinterHexaFactory initialized successfully');

      return linterDelayedJobs;
    } catch (error) {
      this.logger.error('Failed to initialize LinterHexaFactory', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async buildLinterDelayedJobs(
    jobsHexa: JobsHexa,
    getStandardsAdapter: () => IStandardsPort,
    getLinterAdapter: () => ILinterPort,
  ): Promise<ILinterDelayedJobs> {
    // Register generate program job queue with JobsHexa
    const generateProgramJobFactory = new GenerateProgramJobFactory(
      this.logger,
      this.repositories,
      getStandardsAdapter,
      () => this.linterAstAdapter,
    );

    jobsHexa.registerJobQueue(
      generateProgramJobFactory.getQueueName(),
      generateProgramJobFactory,
    );

    await generateProgramJobFactory.createQueue();

    if (!generateProgramJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for GenerateProgramJobFactory');
    }

    // Register assess rule detection job queue with JobsHexa
    const assessRuleDetectionJobFactory = new AssessRuleDetectionJobFactory(
      this.repositories,
      getStandardsAdapter,
      getLinterAdapter,
    );

    jobsHexa.registerJobQueue(
      assessRuleDetectionJobFactory.getQueueName(),
      assessRuleDetectionJobFactory,
    );

    await assessRuleDetectionJobFactory.createQueue();

    if (!assessRuleDetectionJobFactory.delayedJob) {
      throw new Error('DelayedJob not found for AssessRuleDetectionJobFactory');
    }

    return {
      generateProgramDelayedJob: generateProgramJobFactory.delayedJob,
      assessRuleDetectionDelayedJob: assessRuleDetectionJobFactory.delayedJob,
    };
  }

  getDetectionProgramService(): DetectionProgramService {
    return this.detectionProgramService;
  }

  getRepositories(): ILinterRepositories {
    return this.repositories;
  }

  setLinterAstAdapter(adapter: ILinterAstPort): void {
    this.linterAstAdapter = adapter;
  }

  getLinterAstAdapter(): ILinterAstPort | null {
    return this.linterAstAdapter;
  }
}
