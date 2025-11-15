import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  CaptureTopicCommand,
  CaptureTopicResponse,
  ILearningsPort,
} from '@packmind/types';
import { LearningsServices } from '../services/LearningsServices';
import { CaptureTopicUsecase } from '../useCases/captureTopic/captureTopic.usecase';

const origin = 'LearningsAdapter';

/**
 * LearningsAdapter - Main adapter for the Learnings domain.
 * Implements the hexagonal architecture adapter pattern.
 */
export class LearningsAdapter
  implements IBaseAdapter<ILearningsPort>, ILearningsPort
{
  private captureTopicUsecase: CaptureTopicUsecase;

  constructor(
    private readonly learningsServices: LearningsServices,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('LearningsAdapter constructed - awaiting initialization');

    // Initialize use cases with services
    this.logger.debug('Initializing use cases');
    this.captureTopicUsecase = new CaptureTopicUsecase(
      this.learningsServices.getTopicService(),
      this.logger,
    );
  }

  /**
   * Initialize adapter with ports from registry.
   * Future: Will receive required ports (StandardsPort, RecipesPort, etc.) when needed for distillation.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing LearningsAdapter');
    // No ports needed yet - distillation will need StandardsPort and RecipesPort in Phase 3
    this.logger.info('LearningsAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready (all required dependencies initialized).
   */
  public isReady(): boolean {
    return true;
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
}
