import { PackmindLogger, LogLevel } from '@packmind/logger';
import {
  DeleteTopicsCommand,
  DeleteTopicsResponse,
  IDeleteTopicsUseCase,
} from '@packmind/types';
import { ITopicRepository } from '../../../domain/repositories/ITopicRepository';

const origin = 'DeleteTopicsUseCase';

export class DeleteTopicsUsecase implements IDeleteTopicsUseCase {
  constructor(
    private readonly topicRepository: ITopicRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('DeleteTopicsUsecase initialized');
  }

  public async execute(
    command: DeleteTopicsCommand,
  ): Promise<DeleteTopicsResponse> {
    const { topicIds, spaceId } = command;

    this.logger.info('Deleting topics batch', {
      count: topicIds.length,
      spaceId,
    });

    try {
      await Promise.all(
        topicIds.map((topicId) =>
          this.topicRepository.deleteTopic(topicId, spaceId),
        ),
      );

      this.logger.info('Topics batch deleted successfully', {
        count: topicIds.length,
      });

      return {};
    } catch (error) {
      this.logger.error('Failed to delete topics batch', {
        count: topicIds.length,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
