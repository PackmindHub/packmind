import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  OrganizationId,
  StandardDeletedEvent,
  StandardId,
  UserId,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'DeleteStandardUsecase';

export class DeleteStandardUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async deleteStandard(
    standardId: StandardId,
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    this.logger.info('Deleting standard', { standardId });

    try {
      // Get the standard before deleting to retrieve its spaceId
      const standard = await this.standardService.getStandardById(standardId);
      if (!standard) {
        throw new Error(`Standard with id ${standardId} not found`);
      }

      await this.standardService.deleteStandard(standardId, userId);

      // Emit event to notify other domains
      const event = new StandardDeletedEvent({
        standardId,
        spaceId: standard.spaceId,
        organizationId,
        userId,
      });
      this.eventEmitterService.emit(event);
      this.logger.info('StandardDeletedEvent emitted', {
        standardId,
        spaceId: standard.spaceId,
      });

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
