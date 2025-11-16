import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter, JobsService } from '@packmind/node-utils';
import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  CaptureTopicCommand,
  CaptureTopicResponse,
  DistillTopicCommand,
  DistillTopicResponse,
  DistillAllPendingTopicsCommand,
  DistillAllPendingTopicsResponse,
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
  GetTopicsStatsCommand,
  GetTopicsStatsResponse,
  ILearningsPort,
  IRecipesPort,
  IRecipesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse,
} from '@packmind/types';
import { LearningsServices } from '../services/LearningsServices';
import { CaptureTopicUsecase } from '../useCases/captureTopic/captureTopic.usecase';
import { DistillTopicUsecase } from '../useCases/distillTopic/distillTopic.usecase';
import { DistillAllPendingTopicsUsecase } from '../useCases/distillAllPendingTopics/distillAllPendingTopics.usecase';
import { GetTopicsStatsUsecase } from '../useCases/getTopicsStats/getTopicsStats.usecase';
import { ListKnowledgePatchesUsecase } from '../useCases/listKnowledgePatches/listKnowledgePatches.usecase';
import { GetKnowledgePatchUsecase } from '../useCases/getKnowledgePatch/getKnowledgePatch.usecase';
import { AcceptKnowledgePatchUsecase } from '../useCases/acceptKnowledgePatch/acceptKnowledgePatch.usecase';
import { RejectKnowledgePatchUsecase } from '../useCases/rejectKnowledgePatch/rejectKnowledgePatch.usecase';
import { ILearningsDelayedJobs } from '../../domain/jobs/ILearningsDelayedJobs';
import { DistillAllPendingTopicsJobFactory } from '../../infra/jobs/DistillAllPendingTopicsJobFactory';

const origin = 'LearningsAdapter';

/**
 * LearningsAdapter - Main adapter for the Learnings domain.
 * Implements the hexagonal architecture adapter pattern.
 */
export class LearningsAdapter
  implements IBaseAdapter<ILearningsPort>, ILearningsPort
{
  private captureTopicUsecase: CaptureTopicUsecase;
  private distillTopicUsecase: DistillTopicUsecase | null = null;
  private distillAllPendingTopicsUsecase: DistillAllPendingTopicsUsecase | null =
    null;
  private getTopicsStatsUsecase: GetTopicsStatsUsecase;
  private listKnowledgePatchesUsecase: ListKnowledgePatchesUsecase;
  private getKnowledgePatchUsecase: GetKnowledgePatchUsecase;
  private acceptKnowledgePatchUsecase: AcceptKnowledgePatchUsecase;
  private rejectKnowledgePatchUsecase: RejectKnowledgePatchUsecase;
  private standardsPort: IStandardsPort | null = null;
  private recipesPort: IRecipesPort | null = null;
  private learningsDelayedJobs: ILearningsDelayedJobs | null = null;

  constructor(
    private readonly learningsServices: LearningsServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('LearningsAdapter constructed - awaiting initialization');

    // Initialize capture use case (doesn't need ports)
    this.logger.debug('Initializing captureTopic use case');
    this.captureTopicUsecase = new CaptureTopicUsecase(
      this.learningsServices.getTopicService(),
      this.logger,
    );

    // Initialize patch management use cases (don't need ports)
    this.logger.debug('Initializing patch management use cases');
    const knowledgePatchService =
      this.learningsServices.getKnowledgePatchService();

    this.listKnowledgePatchesUsecase = new ListKnowledgePatchesUsecase(
      knowledgePatchService,
      this.logger,
    );

    this.getKnowledgePatchUsecase = new GetKnowledgePatchUsecase(
      knowledgePatchService,
      this.logger,
    );

    this.acceptKnowledgePatchUsecase = new AcceptKnowledgePatchUsecase(
      knowledgePatchService,
      null, // patchApplicationService - will be re-initialized after ports are available
      this.logger,
    );

    this.rejectKnowledgePatchUsecase = new RejectKnowledgePatchUsecase(
      knowledgePatchService,
      this.logger,
    );

    this.getTopicsStatsUsecase = new GetTopicsStatsUsecase(
      this.learningsServices.getTopicService(),
      knowledgePatchService,
      this.logger,
    );
  }

  /**
   * Initialize adapter with ports and services from registry.
   */
  public async initialize(ports: {
    [IStandardsPortName]: IStandardsPort;
    [IRecipesPortName]: IRecipesPort;
    jobsService: JobsService;
  }): Promise<void> {
    this.logger.info('Initializing LearningsAdapter with ports and services');

    this.standardsPort = ports[IStandardsPortName];
    this.recipesPort = ports[IRecipesPortName];

    if (!this.standardsPort || !this.recipesPort) {
      throw new Error('LearningsAdapter: Required ports not provided.');
    }

    // Initialize patch application service with ports
    this.logger.debug('Initializing patch application service');
    this.learningsServices.initializePatchApplicationService(
      this.standardsPort,
      this.recipesPort,
    );

    // Initialize distillTopic use case with ports first (needed by delayed job)
    this.logger.debug('Initializing distillTopic use case');
    this.distillTopicUsecase = new DistillTopicUsecase(
      this.learningsServices.getTopicService(),
      this.learningsServices.getKnowledgePatchService(),
      this.standardsPort,
      this.recipesPort,
      this.logger,
    );

    // Build delayed jobs (uses distillTopicUsecase)
    this.learningsDelayedJobs = await this.buildDelayedJobs(ports.jobsService);

    if (!this.learningsDelayedJobs) {
      throw new Error(
        'LearningsAdapter: Failed to build delayed jobs. Ensure JobsService is passed to initialize().',
      );
    }

    // Initialize distillAllPendingTopics use case with delayed job
    this.logger.debug('Initializing distillAllPendingTopics use case');
    this.distillAllPendingTopicsUsecase = new DistillAllPendingTopicsUsecase(
      this.learningsDelayedJobs.distillAllPendingTopicsDelayedJob,
      this.logger,
    );

    // Re-initialize accept patch use case with patch application service
    this.logger.debug(
      'Re-initializing acceptKnowledgePatch use case with patch application service',
    );
    const patchApplicationService =
      this.learningsServices.getPatchApplicationService();
    if (patchApplicationService) {
      this.acceptKnowledgePatchUsecase = new AcceptKnowledgePatchUsecase(
        this.learningsServices.getKnowledgePatchService(),
        patchApplicationService,
        this.logger,
      );
    }

    this.logger.info('LearningsAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required dependencies initialized).
   */
  public isReady(): boolean {
    return (
      this.standardsPort !== null &&
      this.recipesPort !== null &&
      this.distillTopicUsecase !== null &&
      this.distillAllPendingTopicsUsecase !== null &&
      this.learningsDelayedJobs !== null
    );
  }

  /**
   * Build delayed jobs for the learnings domain.
   */
  private async buildDelayedJobs(
    jobsService: JobsService,
  ): Promise<ILearningsDelayedJobs> {
    this.logger.debug('Building learnings delayed jobs');

    if (!this.distillTopicUsecase) {
      throw new Error(
        'LearningsAdapter: distillTopicUsecase must be initialized before building delayed jobs',
      );
    }

    const jobFactory = new DistillAllPendingTopicsJobFactory(
      this.logger,
      this.learningsServices.getTopicService(),
      this.distillTopicUsecase,
    );

    jobsService.registerJobQueue(jobFactory.getQueueName(), jobFactory);

    await jobFactory.createQueue();

    if (!jobFactory.delayedJob) {
      throw new Error(
        'LearningsAdapter: Failed to create delayed job for distilling topics',
      );
    }

    this.logger.info('Learnings delayed jobs built successfully');

    return {
      distillAllPendingTopicsDelayedJob: jobFactory.delayedJob,
    };
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ILearningsPort {
    return this as ILearningsPort;
  }

  /**
   * Capture a topic (technical decision).
   */
  public async captureTopic(
    command: CaptureTopicCommand,
  ): Promise<CaptureTopicResponse> {
    this.logger.info('captureTopic called', {
      title: command.title,
      spaceId: command.spaceId,
    });

    return await this.captureTopicUsecase.execute(command);
  }

  /**
   * Distill a topic into knowledge patches.
   */
  public async distillTopic(
    command: DistillTopicCommand,
  ): Promise<DistillTopicResponse> {
    this.logger.info('distillTopic called', {
      topicId: command.topicId,
      userId: command.userId,
    });

    if (!this.distillTopicUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.distillTopicUsecase.execute(command);
  }

  /**
   * List knowledge patches by space and optionally by status.
   */
  public async listKnowledgePatches(
    command: ListKnowledgePatchesCommand,
  ): Promise<ListKnowledgePatchesResponse> {
    this.logger.info('listKnowledgePatches called', {
      spaceId: command.spaceId,
      status: command.status,
    });

    return await this.listKnowledgePatchesUsecase.execute(command);
  }

  /**
   * Get a single knowledge patch by ID.
   */
  public async getKnowledgePatch(
    command: GetKnowledgePatchCommand,
  ): Promise<GetKnowledgePatchResponse> {
    this.logger.info('getKnowledgePatch called', {
      patchId: command.patchId,
    });

    return await this.getKnowledgePatchUsecase.execute(command);
  }

  /**
   * Accept a knowledge patch.
   */
  public async acceptKnowledgePatch(
    command: AcceptKnowledgePatchCommand,
  ): Promise<AcceptKnowledgePatchResponse> {
    this.logger.info('acceptKnowledgePatch called', {
      patchId: command.patchId,
      reviewedBy: command.reviewedBy,
    });

    return await this.acceptKnowledgePatchUsecase.execute(command);
  }

  /**
   * Reject a knowledge patch.
   */
  public async rejectKnowledgePatch(
    command: RejectKnowledgePatchCommand,
  ): Promise<RejectKnowledgePatchResponse> {
    this.logger.info('rejectKnowledgePatch called', {
      patchId: command.patchId,
      reviewedBy: command.reviewedBy,
    });

    return await this.rejectKnowledgePatchUsecase.execute(command);
  }

  /**
   * Distill all pending topics in a space.
   */
  public async distillAllPendingTopics(
    command: DistillAllPendingTopicsCommand,
  ): Promise<DistillAllPendingTopicsResponse> {
    this.logger.info('distillAllPendingTopics called', {
      spaceId: command.spaceId,
      userId: command.userId,
    });

    if (!this.distillAllPendingTopicsUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.distillAllPendingTopicsUsecase.execute(command);
  }

  /**
   * Get topics statistics for a space.
   */
  public async getTopicsStats(
    command: GetTopicsStatsCommand,
  ): Promise<GetTopicsStatsResponse> {
    this.logger.info('getTopicsStats called', {
      spaceId: command.spaceId,
    });

    return await this.getTopicsStatsUsecase.execute(command);
  }
}
