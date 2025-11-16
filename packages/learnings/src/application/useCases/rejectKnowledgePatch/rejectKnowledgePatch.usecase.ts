import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createKnowledgePatchId,
  createUserId,
  IRejectKnowledgePatchUseCase,
  KnowledgePatchStatus,
  RejectKnowledgePatchCommand,
  RejectKnowledgePatchResponse,
} from '@packmind/types';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';

const origin = 'RejectKnowledgePatchUsecase';

export class RejectKnowledgePatchUsecase
  implements IRejectKnowledgePatchUseCase
{
  constructor(
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('RejectKnowledgePatchUsecase initialized');
  }

  public async execute(
    command: RejectKnowledgePatchCommand,
  ): Promise<RejectKnowledgePatchResponse> {
    const {
      patchId: patchIdString,
      reviewedBy: reviewedByString,
      reviewNotes,
    } = command;

    const patchId = createKnowledgePatchId(patchIdString);
    const reviewedBy = createUserId(reviewedByString);

    this.logger.info('Rejecting knowledge patch', {
      patchId,
      reviewedBy,
    });

    try {
      if (!reviewNotes || reviewNotes.trim() === '') {
        this.logger.warn('Review notes are required for rejection', {
          patchId,
        });
        throw new Error('Review notes are required when rejecting a patch');
      }

      const patch = await this.knowledgePatchService.getPatchById(patchId);

      if (!patch) {
        this.logger.warn('Knowledge patch not found', { patchId });
        throw new Error(`Knowledge patch with id ${patchId} not found`);
      }

      if (patch.status !== KnowledgePatchStatus.PENDING_REVIEW) {
        this.logger.warn('Knowledge patch is not pending review', {
          patchId,
          currentStatus: patch.status,
        });
        throw new Error(
          `Knowledge patch ${patchId} is not pending review (current status: ${patch.status})`,
        );
      }

      const updatedPatch = await this.knowledgePatchService.updatePatchStatus(
        patchId,
        KnowledgePatchStatus.REJECTED,
        reviewedBy,
        reviewNotes,
      );

      this.logger.info('Knowledge patch rejected successfully', {
        patchId,
        reviewedBy,
      });

      return { patch: updatedPatch };
    } catch (error) {
      this.logger.error('Failed to reject knowledge patch', {
        patchId,
        reviewedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
