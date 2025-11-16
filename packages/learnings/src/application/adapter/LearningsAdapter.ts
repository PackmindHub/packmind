import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  CaptureTopicCommand,
  CaptureTopicResponse,
  DistillTopicCommand,
  DistillTopicResponse,
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
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
import { ListKnowledgePatchesUsecase } from '../useCases/listKnowledgePatches/listKnowledgePatches.usecase';
import { GetKnowledgePatchUsecase } from '../useCases/getKnowledgePatch/getKnowledgePatch.usecase';
import { AcceptKnowledgePatchUsecase } from '../useCases/acceptKnowledgePatch/acceptKnowledgePatch.usecase';
import { RejectKnowledgePatchUsecase } from '../useCases/rejectKnowledgePatch/rejectKnowledgePatch.usecase';

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
  private listKnowledgePatchesUsecase: ListKnowledgePatchesUsecase;
  private getKnowledgePatchUsecase: GetKnowledgePatchUsecase;
  private acceptKnowledgePatchUsecase: AcceptKnowledgePatchUsecase;
  private rejectKnowledgePatchUsecase: RejectKnowledgePatchUsecase;
  private standardsPort: IStandardsPort | null = null;
  private recipesPort: IRecipesPort | null = null;

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
      this.logger,
    );

    this.rejectKnowledgePatchUsecase = new RejectKnowledgePatchUsecase(
      knowledgePatchService,
      this.logger,
    );
  }

  /**
   * Initialize adapter with ports from registry.
   */
  public async initialize(ports: {
    [IStandardsPortName]: IStandardsPort;
    [IRecipesPortName]: IRecipesPort;
  }): Promise<void> {
    this.logger.info('Initializing LearningsAdapter with ports');

    this.standardsPort = ports[IStandardsPortName];
    this.recipesPort = ports[IRecipesPortName];

    // Initialize distillTopic use case with ports
    this.logger.debug('Initializing distillTopic use case');
    this.distillTopicUsecase = new DistillTopicUsecase(
      this.learningsServices.getTopicService(),
      this.learningsServices.getKnowledgePatchService(),
      this.standardsPort,
      this.recipesPort,
      this.logger,
    );

    this.logger.info('LearningsAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required dependencies initialized).
   */
  public isReady(): boolean {
    return (
      this.standardsPort !== null &&
      this.recipesPort !== null &&
      this.distillTopicUsecase !== null
    );
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
}
