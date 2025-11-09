import { StandardService } from '../../services/StandardService';
import { StandardId } from '../../../domain/entities/Standard';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { UserId } from '@packmind/types';

const origin = 'DeleteStandardUsecase';

export class DeleteStandardUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('DeleteStandardUsecase initialized');
  }

  public async deleteStandard(
    standardId: StandardId,
    userId: UserId,
  ): Promise<void> {
    this.logger.info('Deleting standard', { standardId });

    try {
      await this.standardService.deleteStandard(standardId, userId);
      this.logger.info('Standard deleted successfully', { standardId });
    } catch (error) {
      this.logger.error('Failed to delete standard', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
