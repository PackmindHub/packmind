import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  CaptureTopicCommand,
  CaptureTopicResponse,
  DistillTopicCommand,
  DistillTopicResponse,
  ILearningsPort,
  IRecipesPort,
  IRecipesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { LearningsServices } from '../services/LearningsServices';
import { CaptureTopicUsecase } from '../useCases/captureTopic/captureTopic.usecase';
import { DistillTopicUsecase } from '../useCases/distillTopic/distillTopic.usecase';

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
}
