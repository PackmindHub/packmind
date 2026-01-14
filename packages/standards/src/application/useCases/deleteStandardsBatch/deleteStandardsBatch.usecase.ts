import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  OrganizationId,
  StandardDeletedEvent,
  StandardId,
  UserId,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'DeleteStandardsBatchUsecase';

export class DeleteStandardsBatchUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  public async deleteStandardsBatch(
    standardIds: StandardId[],
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<void> {
    this.logger.info('Deleting standards batch', { count: standardIds.length });

    try {
      // Get all standards before deleting to retrieve their spaceIds
      const standards = await Promise.all(
        standardIds.map((id) => this.standardService.getStandardById(id)),
      );

      // Delete all standards
      await Promise.all(
        standardIds.map((id) =>
          this.standardService.deleteStandard(id, userId),
        ),
      );

      // Emit events for each deleted standard
      for (let i = 0; i < standardIds.length; i++) {
        const standard = standards[i];
        if (standard) {
          const event = new StandardDeletedEvent({
            standardId: standardIds[i],
            spaceId: standard.spaceId,
            organizationId,
            userId,
            source: 'ui',
          });
          this.eventEmitterService.emit(event);
        }
      }

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
