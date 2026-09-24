import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardVersion } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { StandardVersionId } from '@packmind/types';

const origin = 'GetStandardVersionByIdUseCase';

export class GetStandardVersionByIdUseCase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetStandardVersionByIdUseCase initialized');
  }

  public async getStandardVersionById(
    versionId: StandardVersionId,
  ): Promise<StandardVersion | null> {
    this.logger.info('Getting standard version by ID', { versionId });

    const standardVersion =
      await this.standardVersionService.getStandardVersionById(versionId);
    this.logger.info('Standard version retrieved by ID successfully', {
      versionId,
      found: !!standardVersion,
    });
    return standardVersion;
  }
}
