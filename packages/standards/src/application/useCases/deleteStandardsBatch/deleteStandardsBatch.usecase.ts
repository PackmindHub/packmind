import { StandardService } from '../../services/StandardService';
import { StandardId } from '../../../domain/entities/Standard';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { UserId } from '@packmind/types';

const origin = 'DeleteStandardsBatchUsecase';

export class DeleteStandardsBatchUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeleteStandardsBatchUsecase initialized');
  }

  public async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
  ): Promise<void> {
    this.logger.info('Deleting standards batch', { count: standardIds.length });

    try {
      await Promise.all(
        standardIds.map((id) =>
          this.standardService.deleteStandard(id, userId),
        ),
      );
      this.logger.info('Standards batch deleted successfully', {
        count: standardIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to delete standards batch', {
        count: standardIds.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
