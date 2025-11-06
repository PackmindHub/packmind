import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { StandardId } from '../../../domain/entities/Standard';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'GetLatestStandardVersionUsecase';

export class GetLatestStandardVersionUsecase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetLatestStandardVersionUsecase initialized');
  }

  public async getLatestStandardVersion(
    standardId: StandardId,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting latest standard version', { standardId });

    try {
      const standardVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);
      this.logger.info('Latest standard version retrieved successfully', {
        standardId,
        found: !!standardVersion,
      });
      return standardVersion;
    } catch (error) {
      this.logger.error('Failed to get latest standard version', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
