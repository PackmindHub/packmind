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
  GetTopicByIdCommand,
  GetTopicByIdResponse,
  GetTopicsStatsCommand,
  GetTopicsStatsResponse,
  IAccountsPort,
  IAccountsPortName,
  ILearningsPort,
  IRecipesPort,
  IRecipesPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
  ListTopicsCommand,
  ListTopicsResponse,
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse,
  SearchArtifactsBySemanticsCommand,
  SearchArtifactsBySemanticsResponse,
  GetEmbeddingHealthCommand,
  GetEmbeddingHealthResponse,
  TriggerEmbeddingBackfillCommand,
  TriggerEmbeddingBackfillResponse,
  StandardVersionId,
  RecipeVersionId,
  GetRagLabConfigurationCommand,
  GetRagLabConfigurationResult,
  UpdateRagLabConfigurationCommand,
  RagLabConfiguration,
  TriggerFullReembeddingCommand,
  TriggerFullReembeddingResponse,
} from '@packmind/types';
import { LearningsServices } from '../services/LearningsServices';
import { CaptureTopicUsecase } from '../useCases/captureTopic/captureTopic.usecase';
import { DistillTopicUsecase } from '../useCases/distillTopic/distillTopic.usecase';
import { QueueDistillTopicsUsecase } from '../useCases/queueDistillTopics/queueDistillTopics.usecase';
import { DistillAllPendingTopicsUsecase } from '../useCases/distillAllPendingTopics/distillAllPendingTopics.usecase';
import { GetTopicsStatsUsecase } from '../useCases/getTopicsStats/getTopicsStats.usecase';
import { GetTopicByIdUsecase } from '../useCases/getTopicById/getTopicById.usecase';
import { ListTopicsUsecase } from '../useCases/listTopics/listTopics.usecase';
import { ListKnowledgePatchesUsecase } from '../useCases/listKnowledgePatches/listKnowledgePatches.usecase';
import { GetKnowledgePatchUsecase } from '../useCases/getKnowledgePatch/getKnowledgePatch.usecase';
import { AcceptKnowledgePatchUsecase } from '../useCases/acceptKnowledgePatch/acceptKnowledgePatch.usecase';
import { RejectKnowledgePatchUsecase } from '../useCases/rejectKnowledgePatch/rejectKnowledgePatch.usecase';
import { SearchArtifactsBySemanticsUsecase } from '../useCases/searchArtifactsBySemantics/searchArtifactsBySemantics.usecase';
import { GetEmbeddingHealthUsecase } from '../useCases/getEmbeddingHealth/getEmbeddingHealth.usecase';
import { TriggerEmbeddingBackfillUsecase } from '../useCases/triggerEmbeddingBackfill/triggerEmbeddingBackfill.usecase';
import { GetRagLabConfigurationUseCase } from '../useCases/getRagLabConfiguration/GetRagLabConfigurationUseCase';
import { UpdateRagLabConfigurationUseCase } from '../useCases/updateRagLabConfiguration/UpdateRagLabConfigurationUseCase';
import { TriggerFullReembeddingUseCase } from '../useCases/triggerFullReembedding/TriggerFullReembeddingUseCase';
import { ILearningsDelayedJobs } from '../../domain/jobs/ILearningsDelayedJobs';
import { DistillTopicsJobFactory } from '../../infra/jobs/DistillTopicsJobFactory';
import { GenerateStandardEmbeddingJobFactory } from '../../infra/jobs/GenerateStandardEmbeddingJobFactory';
import { GenerateRecipeEmbeddingJobFactory } from '../../infra/jobs/GenerateRecipeEmbeddingJobFactory';

const origin = 'LearningsAdapter';

/**
 * LearningsAdapter - Main adapter for the Learnings domain.
 * Implements the hexagonal architecture adapter pattern.
 */
export class LearningsAdapter
  implements IBaseAdapter<ILearningsPort>, ILearningsPort
{
  private captureTopicUsecase: CaptureTopicUsecase;
  private distillTopicWorkerUsecase: DistillTopicUsecase | null = null;
  private queueDistillTopicsUsecase: QueueDistillTopicsUsecase | null = null;
  private distillAllPendingTopicsUsecase: DistillAllPendingTopicsUsecase | null =
    null;
  private getTopicsStatsUsecase: GetTopicsStatsUsecase;
  private listTopicsUsecase: ListTopicsUsecase | null = null;
  private getTopicByIdUsecase: GetTopicByIdUsecase | null = null;
  private listKnowledgePatchesUsecase: ListKnowledgePatchesUsecase;
  private getKnowledgePatchUsecase: GetKnowledgePatchUsecase;
  private acceptKnowledgePatchUsecase: AcceptKnowledgePatchUsecase;
  private rejectKnowledgePatchUsecase: RejectKnowledgePatchUsecase;
  private searchArtifactsBySemanticsUsecase: SearchArtifactsBySemanticsUsecase | null =
    null;
  private getEmbeddingHealthUsecase: GetEmbeddingHealthUsecase | null = null;
  private triggerEmbeddingBackfillUsecase: TriggerEmbeddingBackfillUsecase | null =
    null;
  private getRagLabConfigurationUseCase: GetRagLabConfigurationUseCase;
  private updateRagLabConfigurationUseCase: UpdateRagLabConfigurationUseCase;
  private triggerFullReembeddingUseCase: TriggerFullReembeddingUseCase | null =
    null;
  private accountsPort: IAccountsPort | null = null;
  private spacesPort: ISpacesPort | null = null;
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
    const topicService = this.learningsServices.getTopicService();

    this.listKnowledgePatchesUsecase = new ListKnowledgePatchesUsecase(
      knowledgePatchService,
      this.logger,
    );

    this.getKnowledgePatchUsecase = new GetKnowledgePatchUsecase(
      knowledgePatchService,
      topicService,
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

    // Initialize RAG Lab configuration use cases
    this.logger.debug('Initializing RAG Lab configuration use cases');
    const ragLabConfigurationRepository =
      this.learningsServices.getRagLabConfigurationRepository();

    this.getRagLabConfigurationUseCase = new GetRagLabConfigurationUseCase(
      ragLabConfigurationRepository,
      this.logger,
    );

    this.updateRagLabConfigurationUseCase =
      new UpdateRagLabConfigurationUseCase(
        ragLabConfigurationRepository,
        this.logger,
      );
  }

  /**
   * Initialize adapter with ports and services from registry.
   */
  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
    [ISpacesPortName]: ISpacesPort;
    [IStandardsPortName]: IStandardsPort;
    [IRecipesPortName]: IRecipesPort;
    jobsService: JobsService;
  }): Promise<void> {
    this.logger.info('Initializing LearningsAdapter with ports and services');

    this.accountsPort = ports[IAccountsPortName];
    this.spacesPort = ports[ISpacesPortName];
    this.standardsPort = ports[IStandardsPortName];
    this.recipesPort = ports[IRecipesPortName];

    if (
      !this.accountsPort ||
      !this.spacesPort ||
      !this.standardsPort ||
      !this.recipesPort
    ) {
      throw new Error('LearningsAdapter: Required ports not provided.');
    }

    // Initialize patch application service with ports
    this.logger.debug('Initializing patch application service');
    this.learningsServices.initializePatchApplicationService(
      this.standardsPort,
      this.recipesPort,
    );

    // Initialize distillTopic worker use case with ports first (needed by delayed job)
    this.logger.debug('Initializing distillTopic worker use case');
    this.distillTopicWorkerUsecase = new DistillTopicUsecase(
      this.learningsServices.getTopicService(),
      this.learningsServices.getKnowledgePatchService(),
      this.learningsServices.getTopicRepository(),
      this.learningsServices.getTopicKnowledgePatchRepository(),
      this.standardsPort,
      this.recipesPort,
      this.logger,
    );

    // Initialize embedding orchestration service with ports
    this.logger.debug('Initializing embedding orchestration service');
    this.learningsServices.initializeEmbeddingOrchestrationService(
      this.standardsPort,
      this.recipesPort,
      this.spacesPort,
      this.logger,
    );

    // Initialize topic list and get use cases
    this.logger.debug('Initializing listTopics use case');
    this.listTopicsUsecase = new ListTopicsUsecase(
      this.accountsPort,
      this.learningsServices.getTopicService(),
      this.spacesPort,
      this.logger,
    );

    this.logger.debug('Initializing getTopicById use case');
    this.getTopicByIdUsecase = new GetTopicByIdUsecase(
      this.accountsPort,
      this.learningsServices.getTopicService(),
      this.spacesPort,
      this.logger,
    );

    // Build delayed jobs (uses distillTopicUsecase)
    this.learningsDelayedJobs = await this.buildDelayedJobs(ports.jobsService);

    if (!this.learningsDelayedJobs) {
      throw new Error(
        'LearningsAdapter: Failed to build delayed jobs. Ensure JobsService is passed to initialize().',
      );
    }

    // Initialize queue-based distillTopic use case with delayed job
    this.logger.debug('Initializing queueDistillTopics use case');
    this.queueDistillTopicsUsecase = new QueueDistillTopicsUsecase(
      this.learningsDelayedJobs.distillTopicsDelayedJob,
      this.logger,
    );

    // Initialize distillAllPendingTopics use case with delayed job
    this.logger.debug('Initializing distillAllPendingTopics use case');
    this.distillAllPendingTopicsUsecase = new DistillAllPendingTopicsUsecase(
      this.learningsDelayedJobs.distillTopicsDelayedJob,
      this.learningsServices.getTopicService(),
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

    // Initialize RAG Lab use cases
    this.logger.debug('Initializing searchArtifactsBySemantics use case');
    this.searchArtifactsBySemanticsUsecase =
      new SearchArtifactsBySemanticsUsecase(
        this.accountsPort,
        this.learningsServices.getEmbeddingOrchestrationService(),
        this.spacesPort,
        this.logger,
      );

    this.logger.debug('Initializing getEmbeddingHealth use case');
    this.getEmbeddingHealthUsecase = new GetEmbeddingHealthUsecase(
      this.accountsPort,
      this.learningsServices.getEmbeddingOrchestrationService(),
      this.spacesPort,
      this.standardsPort,
      this.recipesPort,
      this.logger,
    );

    this.logger.debug('Initializing triggerEmbeddingBackfill use case');
    this.triggerEmbeddingBackfillUsecase = new TriggerEmbeddingBackfillUsecase(
      this.accountsPort,
      this.learningsServices.getEmbeddingOrchestrationService(),
      this.spacesPort,
      this,
      this.logger,
    );

    this.logger.debug('Initializing triggerFullReembedding use case');
    this.triggerFullReembeddingUseCase = new TriggerFullReembeddingUseCase(
      this.spacesPort,
      this.standardsPort,
      this.recipesPort,
      (versionId) => this.enqueueStandardEmbeddingGeneration(versionId),
      (versionId) => this.enqueueRecipeEmbeddingGeneration(versionId),
      this.logger,
    );

    this.logger.info('LearningsAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required dependencies initialized).
   */
  public isReady(): boolean {
    return (
      this.accountsPort !== null &&
      this.spacesPort !== null &&
      this.standardsPort !== null &&
      this.recipesPort !== null &&
      this.distillTopicWorkerUsecase !== null &&
      this.queueDistillTopicsUsecase !== null &&
      this.distillAllPendingTopicsUsecase !== null &&
      this.listTopicsUsecase !== null &&
      this.getTopicByIdUsecase !== null &&
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

    if (!this.distillTopicWorkerUsecase) {
      throw new Error(
        'LearningsAdapter: distillTopicWorkerUsecase must be initialized before building delayed jobs',
      );
    }

    const distillTopicsFactory = new DistillTopicsJobFactory(
      this.logger,
      this.distillTopicWorkerUsecase,
    );

    jobsService.registerJobQueue(
      distillTopicsFactory.getQueueName(),
      distillTopicsFactory,
    );

    await distillTopicsFactory.createQueue();

    if (!distillTopicsFactory.delayedJob) {
      throw new Error(
        'LearningsAdapter: Failed to create delayed job for distilling topics',
      );
    }

    // Build embedding jobs
    const embeddingService =
      this.learningsServices.getEmbeddingOrchestrationService();

    const standardEmbeddingFactory = new GenerateStandardEmbeddingJobFactory(
      this.logger,
      embeddingService,
    );

    jobsService.registerJobQueue(
      standardEmbeddingFactory.getQueueName(),
      standardEmbeddingFactory,
    );

    await standardEmbeddingFactory.createQueue();

    if (!standardEmbeddingFactory.delayedJob) {
      throw new Error(
        'LearningsAdapter: Failed to create delayed job for standard embedding generation',
      );
    }

    const recipeEmbeddingFactory = new GenerateRecipeEmbeddingJobFactory(
      this.logger,
      embeddingService,
    );

    jobsService.registerJobQueue(
      recipeEmbeddingFactory.getQueueName(),
      recipeEmbeddingFactory,
    );

    await recipeEmbeddingFactory.createQueue();

    if (!recipeEmbeddingFactory.delayedJob) {
      throw new Error(
        'LearningsAdapter: Failed to create delayed job for recipe embedding generation',
      );
    }

    this.logger.info('Learnings delayed jobs built successfully');

    return {
      distillTopicsDelayedJob: distillTopicsFactory.delayedJob,
      generateStandardEmbeddingDelayedJob: standardEmbeddingFactory.delayedJob,
      generateRecipeEmbeddingDelayedJob: recipeEmbeddingFactory.delayedJob,
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
   * Distill a topic into knowledge patches (queues a background job).
   */
  public async distillTopic(
    command: DistillTopicCommand,
  ): Promise<DistillTopicResponse> {
    this.logger.info('distillTopic called', {
      topicId: command.topicId,
      userId: command.userId,
    });

    if (!this.queueDistillTopicsUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.queueDistillTopicsUsecase.execute(command);
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

  /**
   * List topics by space.
   */
  public async listTopics(
    command: ListTopicsCommand,
  ): Promise<ListTopicsResponse> {
    this.logger.info('listTopics called', {
      spaceId: command.spaceId,
    });

    if (!this.listTopicsUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.listTopicsUsecase.execute(command);
  }

  /**
   * Get a single topic by ID.
   */
  public async getTopicById(
    command: GetTopicByIdCommand,
  ): Promise<GetTopicByIdResponse> {
    this.logger.info('getTopicById called', {
      topicId: command.topicId,
      spaceId: command.spaceId,
    });

    if (!this.getTopicByIdUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.getTopicByIdUsecase.execute(command);
  }

  /**
   * Enqueue standard embedding generation job.
   */
  public async searchArtifactsBySemantics(
    command: SearchArtifactsBySemanticsCommand,
  ): Promise<SearchArtifactsBySemanticsResponse> {
    this.logger.info('searchArtifactsBySemantics called', {
      spaceId: command.spaceId,
      queryTextLength: command.queryText.length,
    });

    if (!this.searchArtifactsBySemanticsUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.searchArtifactsBySemanticsUsecase.execute(command);
  }

  public async getEmbeddingHealth(
    command: GetEmbeddingHealthCommand,
  ): Promise<GetEmbeddingHealthResponse> {
    this.logger.info('getEmbeddingHealth called', {
      spaceId: command.spaceId,
    });

    if (!this.getEmbeddingHealthUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.getEmbeddingHealthUsecase.execute(command);
  }

  public async triggerEmbeddingBackfill(
    command: TriggerEmbeddingBackfillCommand,
  ): Promise<TriggerEmbeddingBackfillResponse> {
    this.logger.info('triggerEmbeddingBackfill called', {
      spaceId: command.spaceId,
    });

    if (!this.triggerEmbeddingBackfillUsecase) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    return await this.triggerEmbeddingBackfillUsecase.execute(command);
  }

  public async enqueueStandardEmbeddingGeneration(
    versionId: StandardVersionId,
  ): Promise<void> {
    this.logger.info('enqueueStandardEmbeddingGeneration called', {
      versionId,
    });

    if (!this.learningsDelayedJobs?.generateStandardEmbeddingDelayedJob) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    await this.learningsDelayedJobs.generateStandardEmbeddingDelayedJob.addJob({
      versionId,
    });

    this.logger.info('Enqueued standard embedding generation', { versionId });
  }

  /**
   * Enqueue recipe embedding generation job.
   */
  public async enqueueRecipeEmbeddingGeneration(
    versionId: RecipeVersionId,
  ): Promise<void> {
    this.logger.info('enqueueRecipeEmbeddingGeneration called', {
      versionId,
    });

    if (!this.learningsDelayedJobs?.generateRecipeEmbeddingDelayedJob) {
      throw new Error(
        'LearningsAdapter not fully initialized. Call initialize() first.',
      );
    }

    await this.learningsDelayedJobs.generateRecipeEmbeddingDelayedJob.addJob({
      versionId,
    });

    this.logger.info('Enqueued recipe embedding generation', { versionId });
  }

  /**
   * Get RAG Lab configuration for an organization.
   */
  public async getRagLabConfiguration(
    command: GetRagLabConfigurationCommand,
  ): Promise<GetRagLabConfigurationResult> {
    return this.getRagLabConfigurationUseCase.execute(command);
  }

  /**
   * Update RAG Lab configuration for an organization.
   */
  public async updateRagLabConfiguration(
    command: UpdateRagLabConfigurationCommand,
  ): Promise<RagLabConfiguration> {
    return this.updateRagLabConfigurationUseCase.execute(command);
  }

  /**
   * Trigger full re-embedding of all standards and recipes across all spaces in an organization.
   * This is typically used after changing the RAG Lab embedding configuration.
   */
  public async triggerFullReembedding(
    command: TriggerFullReembeddingCommand,
  ): Promise<TriggerFullReembeddingResponse> {
    if (!this.triggerFullReembeddingUseCase) {
      throw new Error(
        'LearningsAdapter: triggerFullReembeddingUseCase not initialized. Call initialize() first.',
      );
    }
    return this.triggerFullReembeddingUseCase.execute(command);
  }
}
