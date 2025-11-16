import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  createKnowledgePatchId,
  createUserId,
  IAcceptKnowledgePatchUseCase,
  KnowledgePatchStatus,
} from '@packmind/types';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';

const origin = 'AcceptKnowledgePatchUsecase';

export class AcceptKnowledgePatchUsecase
  implements IAcceptKnowledgePatchUseCase
{
  constructor(
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('AcceptKnowledgePatchUsecase initialized');
  }

  public async execute(
    command: AcceptKnowledgePatchCommand,
  ): Promise<AcceptKnowledgePatchResponse> {
    const {
      patchId: patchIdString,
      reviewedBy: reviewedByString,
      reviewNotes,
    } = command;

    const patchId = createKnowledgePatchId(patchIdString);
    const reviewedBy = createUserId(reviewedByString);

    this.logger.info('Accepting knowledge patch', {
      patchId,
      reviewedBy,
    });

    try {
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

      // TODO: Apply the patch to standards/recipes
      // This will be implemented when we have the proper integration with standards/recipes domains
      const applied = false;

      const updatedPatch = await this.knowledgePatchService.updatePatchStatus(
        patchId,
        KnowledgePatchStatus.ACCEPTED,
        reviewedBy,
        reviewNotes,
      );

      this.logger.info('Knowledge patch accepted successfully', {
        patchId,
        reviewedBy,
        applied,
      });

      return { patch: updatedPatch, applied };
    } catch (error) {
      this.logger.error('Failed to accept knowledge patch', {
        patchId,
        reviewedBy,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
