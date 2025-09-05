import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { StandardId } from '../../../domain/entities/Standard';
import { LogLevel, PackmindLogger } from '@packmind/shared';

const origin = 'ListStandardVersionsUsecase';

export class ListStandardVersionsUsecase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListStandardVersionsUsecase initialized');
  }

  public async listStandardVersions(
    standardId: StandardId,
  ): Promise<StandardVersion[]> {
    this.logger.info('Listing standard versions', { standardId });

    try {
      const versions =
        await this.standardVersionService.listStandardVersions(standardId);
      this.logger.info('Standard versions listed successfully', {
        standardId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list standard versions', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
