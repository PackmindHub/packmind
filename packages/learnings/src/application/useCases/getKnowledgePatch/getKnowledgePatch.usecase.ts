import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createKnowledgePatchId,
  GetKnowledgePatchCommand,
  GetKnowledgePatchResponse,
  IGetKnowledgePatchUseCase,
} from '@packmind/types';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { TopicService } from '../../services/TopicService';

const origin = 'GetKnowledgePatchUsecase';

export class GetKnowledgePatchUsecase implements IGetKnowledgePatchUseCase {
  constructor(
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly topicService: TopicService = new TopicService(),
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('GetKnowledgePatchUsecase initialized');
  }

  public async execute(
    command: GetKnowledgePatchCommand,
  ): Promise<GetKnowledgePatchResponse> {
    const { patchId: patchIdString } = command;
    const patchId = createKnowledgePatchId(patchIdString);

    this.logger.info('Getting knowledge patch', { patchId });

    try {
      const patch = await this.knowledgePatchService.getPatchById(patchId);

      if (!patch) {
        this.logger.warn('Knowledge patch not found', { patchId });
        throw new Error(`Knowledge patch with id ${patchId} not found`);
      }

      this.logger.info('Fetching related topics for knowledge patch', {
        patchId,
      });
      const topics =
        await this.topicService.getTopicsByKnowledgePatchId(patchId);

      this.logger.info('Knowledge patch retrieved successfully', {
        patchId,
        topicsCount: topics.length,
      });

      return { patch, topics };
    } catch (error) {
      this.logger.error('Failed to get knowledge patch', {
        patchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
