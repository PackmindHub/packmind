import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  CaptureTopicCommand,
  CaptureTopicResponse,
  createSpaceId,
  createUserId,
  ICaptureTopicUseCase,
} from '@packmind/types';
import { TopicService } from '../../services/TopicService';

const origin = 'CaptureTopicUsecase';

export class CaptureTopicUsecase implements ICaptureTopicUseCase {
  constructor(
    private readonly topicService: TopicService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('CaptureTopicUsecase initialized');
  }

  public async execute(
    command: CaptureTopicCommand,
  ): Promise<CaptureTopicResponse> {
    const {
      title,
      content,
      spaceId: spaceIdString,
      codeExamples,
      captureContext,
      userId: userIdString,
    } = command;

    const userId = createUserId(userIdString);
    const spaceId = createSpaceId(spaceIdString);

    this.logger.info('Starting captureTopic process', {
      title,
      spaceId,
      userId,
      captureContext,
    });

    try {
      const topic = await this.topicService.addTopic({
        title,
        content,
        codeExamples,
        captureContext,
        createdBy: userId,
        spaceId,
      });

      this.logger.info('Topic captured successfully', {
        topicId: topic.id,
        title,
        spaceId,
        userId,
      });

      return topic;
    } catch (error) {
      this.logger.error('Failed to capture topic', {
        title,
        spaceId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
