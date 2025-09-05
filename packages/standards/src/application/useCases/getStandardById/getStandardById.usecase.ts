import { StandardService } from '../../services/StandardService';
import { Standard, StandardId } from '../../../domain/entities/Standard';
import { LogLevel, PackmindLogger } from '@packmind/shared';

const origin = 'GetStandardByIdUsecase';

export class GetStandardByIdUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetStandardByIdUsecase initialized');
  }

  public async getStandardById(id: StandardId): Promise<Standard | null> {
    this.logger.info('Getting standard by ID', { id });

    try {
      const standard = await this.standardService.getStandardById(id);
      this.logger.info('Standard retrieved successfully', {
        id,
        found: !!standard,
      });
      return standard;
    } catch (error) {
      this.logger.error('Failed to get standard by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
