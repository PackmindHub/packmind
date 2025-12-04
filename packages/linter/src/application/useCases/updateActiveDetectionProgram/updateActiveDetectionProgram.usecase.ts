import { LogLevel, PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import { DetectionStatus } from '@packmind/types';
import {
  IUpdateActiveDetectionProgramUseCase,
  UpdateActiveDetectionProgramCommand,
  ActiveDetectionProgram,
  DetectionProgram,
} from '@packmind/types';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { InvalidDetectionProgramStatusError } from '../../../domain/errors';

export class UpdateActiveDetectionProgramUseCase
  implements IUpdateActiveDetectionProgramUseCase
{
  constructor(
    private readonly activeDetectionProgramRepository: IActiveDetectionProgramRepository,
    private readonly detectionProgramRepository: IDetectionProgramRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'UpdateActiveDetectionProgramUseCase',
      LogLevel.DEBUG,
    ),
  ) {}

  async execute(
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram> {
    try {
      let detectionProgramForEvent: DetectionProgram | undefined;

      // Validate that at least one update field is provided
      if (
        command.newDetectionProgramVersion === undefined &&
        command.newDetectionProgramDraftVersion === undefined
      ) {
        throw new Error(
          'At least one of newDetectionProgramVersion or newDetectionProgramDraftVersion must be provided',
        );
      }

      // Validate that newDetectionProgramVersion has READY status before promotion
      if (command.newDetectionProgramVersion !== undefined) {
        const detectionProgram = await this.detectionProgramRepository.findById(
          command.newDetectionProgramVersion,
        );

        if (!detectionProgram) {
          throw new Error(
            `Detection program ${command.newDetectionProgramVersion} not found`,
          );
        }

        if (detectionProgram.status !== DetectionStatus.READY) {
          throw new InvalidDetectionProgramStatusError(
            detectionProgram.id,
            detectionProgram.status,
            DetectionStatus.READY,
          );
        }

        this.logger.info('Detection program status validated', {
          detectionProgramId: detectionProgram.id,
          status: detectionProgram.status,
        });

        detectionProgramForEvent = detectionProgram;
      }

      this.logger.info('Updating active detection program', {
        activeDetectionProgramId: command.activeDetectionProgram.id,
        hasNewDetectionProgramVersion:
          command.newDetectionProgramVersion !== undefined,
        hasNewDetectionProgramDraftVersion:
          command.newDetectionProgramDraftVersion !== undefined,
      });

      // Create updated object with conditionally updated fields
      const updatedActiveDetectionProgram: ActiveDetectionProgram = {
        ...command.activeDetectionProgram,
      };

      // Update detectionProgramVersion if provided
      if (command.newDetectionProgramVersion !== undefined) {
        updatedActiveDetectionProgram.detectionProgramVersion =
          command.newDetectionProgramVersion;
      }

      // Update detectionProgramDraftVersion if provided
      if (command.newDetectionProgramDraftVersion !== undefined) {
        updatedActiveDetectionProgram.detectionProgramDraftVersion =
          command.newDetectionProgramDraftVersion;
      }

      // Update in database
      const result =
        await this.activeDetectionProgramRepository.updateActiveDetectionProgram(
          updatedActiveDetectionProgram,
        );

      this.logger.info('Active detection program updated successfully', {
        activeDetectionProgramId: command.activeDetectionProgram.id,
        detectionProgramVersion: result.detectionProgramVersion,
        detectionProgramDraftVersion: result.detectionProgramDraftVersion,
      });

      if (
        command.newDetectionProgramVersion !== undefined &&
        detectionProgramForEvent
      ) {
        try {
          await SSEEventPublisher.publishProgramStatusEvent(
            command.newDetectionProgramVersion,
            detectionProgramForEvent.ruleId,
            detectionProgramForEvent.language,
            command.userId,
            command.organizationId,
          );
          this.logger.info('SSE event published for active program update', {
            detectionProgramId: command.newDetectionProgramVersion,
            ruleId: detectionProgramForEvent.ruleId,
            language: detectionProgramForEvent.language,
            userId: command.userId,
          });
        } catch (sseError) {
          this.logger.error(
            'Failed to publish SSE event for active program update',
            {
              detectionProgramId: command.newDetectionProgramVersion,
              error:
                sseError instanceof Error ? sseError.message : String(sseError),
            },
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to update active detection program', {
        activeDetectionProgramId: command.activeDetectionProgram.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
