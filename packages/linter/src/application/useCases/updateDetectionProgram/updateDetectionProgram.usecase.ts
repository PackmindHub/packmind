import { LogLevel, PackmindLogger } from '@packmind/logger';
import { SSEEventPublisher } from '@packmind/node-utils';
import {
  IUpdateDetectionProgramUseCase,
  UpdateDetectionProgramCommand,
  DetectionProgram,
} from '@packmind/types';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';

export class UpdateDetectionProgramUseCase implements IUpdateDetectionProgramUseCase {
  constructor(
    private readonly detectionProgramRepository: IDetectionProgramRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'UpdateDetectionProgramUseCase',
      LogLevel.DEBUG,
    ),
  ) {}

  async execute(
    command: UpdateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    try {
      // Find the existing detection program
      const existingDetectionProgram =
        await this.detectionProgramRepository.findById(
          command.detectionProgramId,
        );

      if (!existingDetectionProgram) {
        throw new Error('Detection program not found');
      }

      // Create updated detection program
      const updatedDetectionProgram: DetectionProgram = {
        ...existingDetectionProgram,
        code: command.code,
        mode: command.mode ?? existingDetectionProgram.mode,
        status: command.status ?? existingDetectionProgram.status,
        sourceCodeState: command.sourceCodeState ?? 'NONE',
      };

      // Save the updated detection program
      // Note: This assumes the repository has an update method or add works for updates
      // We might need to add an update method to the repository interface
      const result = await this.detectionProgramRepository.add(
        updatedDetectionProgram,
      );

      this.logger.info('Detection program updated successfully', {
        detectionProgramId: command.detectionProgramId,
        code: command.code,
        mode: updatedDetectionProgram.mode,
        status: updatedDetectionProgram.status,
        sourceCodeState: updatedDetectionProgram.sourceCodeState,
      });

      // Publish SSE event for program status update
      if (command.status) {
        try {
          await SSEEventPublisher.publishProgramStatusEvent(
            command.detectionProgramId,
            updatedDetectionProgram.ruleId,
            updatedDetectionProgram.language,
            command.userId,
            command.organizationId,
          );
          this.logger.info('SSE event published for program status update', {
            detectionProgramId: command.detectionProgramId,
            status: command.status,
            userId: command.userId,
          });
        } catch (sseError) {
          this.logger.error('Failed to publish SSE event for program update', {
            detectionProgramId: command.detectionProgramId,
            error:
              sseError instanceof Error ? sseError.message : String(sseError),
          });
          // Don't throw here - the main operation was successful
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to update detection program', {
        detectionProgramId: command.detectionProgramId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
