import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardVersion } from '@packmind/types';
import { StandardId } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'GetStandardVersionUsecase';

export class GetStandardVersionUsecase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetStandardVersionUsecase initialized');
  }

  public async getStandardVersion(
    standardId: StandardId,
    version: number,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting standard version', { standardId, version });

    try {
      const standardVersion =
        await this.standardVersionService.getStandardVersion(
          standardId,
          version,
        );
      this.logger.info('Standard version retrieved successfully', {
        standardId,
        version,
        found: !!standardVersion,
      });
      return standardVersion;
    } catch (error) {
      this.logger.error('Failed to get standard version', {
        standardId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
