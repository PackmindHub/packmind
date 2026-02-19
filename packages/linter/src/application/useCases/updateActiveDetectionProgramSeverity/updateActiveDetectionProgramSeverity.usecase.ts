import { PackmindLogger } from '@packmind/logger';
import {
  IUpdateActiveDetectionProgramSeverityUseCase,
  UpdateActiveDetectionProgramSeverityCommand,
  ActiveDetectionProgram,
} from '@packmind/types';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { ActiveDetectionProgramNotFoundError } from '../../../domain/errors';

const origin = 'UpdateActiveDetectionProgramSeverityUseCase';

export class UpdateActiveDetectionProgramSeverityUseCase implements IUpdateActiveDetectionProgramSeverityUseCase {
  constructor(
    private readonly activeDetectionProgramRepository: IActiveDetectionProgramRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: UpdateActiveDetectionProgramSeverityCommand,
  ): Promise<ActiveDetectionProgram> {
    this.logger.info('Updating active detection program severity', {
      activeDetectionProgramId: command.activeDetectionProgramId,
      severity: command.severity,
    });

    const existingProgram =
      await this.activeDetectionProgramRepository.findById(
        command.activeDetectionProgramId,
      );

    if (!existingProgram || existingProgram.ruleId !== command.ruleId) {
      throw new ActiveDetectionProgramNotFoundError(
        command.activeDetectionProgramId,
      );
    }

    const result = await this.activeDetectionProgramRepository.updateSeverity(
      command.activeDetectionProgramId,
      command.severity,
    );

    this.logger.info('Active detection program severity updated', {
      activeDetectionProgramId: command.activeDetectionProgramId,
      severity: result.severity,
    });

    return result;
  }
}
