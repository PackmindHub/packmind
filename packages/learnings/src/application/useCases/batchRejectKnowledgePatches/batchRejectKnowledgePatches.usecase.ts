import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  BatchRejectKnowledgePatchesCommand,
  BatchRejectKnowledgePatchesResponse,
  IBatchRejectKnowledgePatchesUseCase,
} from '@packmind/types';
import { RejectKnowledgePatchUsecase } from '../rejectKnowledgePatch/rejectKnowledgePatch.usecase';

const origin = 'BatchRejectKnowledgePatchesUsecase';

export class BatchRejectKnowledgePatchesUsecase
  implements IBatchRejectKnowledgePatchesUseCase
{
  constructor(
    private readonly rejectKnowledgePatchUsecase: RejectKnowledgePatchUsecase,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('BatchRejectKnowledgePatchesUsecase initialized');
  }

  public async execute(
    command: BatchRejectKnowledgePatchesCommand,
  ): Promise<BatchRejectKnowledgePatchesResponse> {
    const {
      patchIds,
      spaceId,
      reviewedBy,
      reviewNotes,
      organizationId,
      userId,
    } = command;

    this.logger.info('Rejecting knowledge patches batch', {
      count: patchIds.length,
      spaceId,
      reviewedBy,
    });

    try {
      await Promise.all(
        patchIds.map((patchId) =>
          this.rejectKnowledgePatchUsecase.execute({
            patchId,
            spaceId,
            reviewedBy,
            reviewNotes,
            organizationId,
            userId,
          }),
        ),
      );

      this.logger.info('Knowledge patches batch rejected successfully', {
        count: patchIds.length,
      });

      return {};
    } catch (error) {
      this.logger.error('Failed to reject knowledge patches batch', {
        count: patchIds.length,
        spaceId,
        reviewedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
