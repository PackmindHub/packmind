import {
  GetTargetByIdCommand,
  GetTargetByIdResponse,
  IGetTargetByIdUseCase,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { TargetService } from '../services/TargetService';

const origin = 'GetTargetByIdUseCase';

export class GetTargetByIdUseCase implements IGetTargetByIdUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: GetTargetByIdCommand): Promise<GetTargetByIdResponse> {
    const { targetId } = command;

    this.logger.info('Getting target by ID', {
      targetId,
      organizationId: command.organizationId,
    });

    try {
      const target = await this.targetService.findById(targetId);

      this.logger.info('Successfully retrieved target by ID', {
        targetId,
        found: target !== null,
      });

      return { target };
    } catch (error) {
      this.logger.error('Failed to get target by ID', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
