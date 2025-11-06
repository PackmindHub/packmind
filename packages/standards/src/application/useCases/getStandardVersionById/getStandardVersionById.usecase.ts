import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { StandardVersionId } from '../../../domain/entities/StandardVersion';

const origin = 'GetStandardVersionByIdUsecase';

export class GetStandardVersionByIdUsecase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetStandardVersionByIdUsecase initialized');
  }

  public async getStandardVersionById(
    versionId: StandardVersionId,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting standard version by ID', { versionId });

    try {
      const standardVersion =
        await this.standardVersionService.getStandardVersionById(versionId);
      this.logger.info('Standard version retrieved by ID successfully', {
        versionId,
        found: !!standardVersion,
      });
      return standardVersion;
    } catch (error) {
      this.logger.error('Failed to get standard version by ID', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
