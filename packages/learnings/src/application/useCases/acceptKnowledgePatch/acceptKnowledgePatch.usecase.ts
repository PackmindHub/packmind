import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AcceptKnowledgePatchCommand,
  AcceptKnowledgePatchResponse,
  createKnowledgePatchId,
  createUserId,
  IAcceptKnowledgePatchUseCase,
  KnowledgePatchStatus,
  OrganizationId,
} from '@packmind/types';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { PatchApplicationService } from '../../services/PatchApplicationService';

const origin = 'AcceptKnowledgePatchUsecase';

export class AcceptKnowledgePatchUsecase
  implements IAcceptKnowledgePatchUseCase
{
  constructor(
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly patchApplicationService: PatchApplicationService | null = null,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('AcceptKnowledgePatchUsecase initialized', {
      hasPatchApplicationService: !!patchApplicationService,
    });
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

      // Apply the patch to standards/recipes if service is available
      let applied = false;
      if (this.patchApplicationService) {
        try {
          this.logger.info('Applying knowledge patch to standards/recipes', {
            patchId,
          });
          applied = await this.patchApplicationService.applyPatch(
            patch,
            command.organizationId as OrganizationId,
            reviewedByString,
          );
          this.logger.info('Knowledge patch applied successfully', {
            patchId,
            applied,
          });
        } catch (error) {
          this.logger.error('Failed to apply knowledge patch', {
            patchId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with acceptance even if application fails
          // The patch will be marked as accepted but not applied
        }
      } else {
        this.logger.warn(
          'PatchApplicationService not available - patch will be accepted but not applied',
          { patchId },
        );
      }

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
