import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  LinterCalledEvent,
  ITrackLinterExecutionUseCase,
  TrackLinterExecutionCommand,
} from '@packmind/types';

const origin = 'TrackLinterExecutionUseCase';

export class TrackLinterExecutionUseCase implements ITrackLinterExecutionUseCase {
  constructor(
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: TrackLinterExecutionCommand) {
    this.logger.info('Tracking linter execution', {
      targetCount: command.targetCount,
      standardCount: command.standardCount,
    });

    // Emit domain event for analytics
    this.eventEmitterService.emit(
      new LinterCalledEvent({
        userId: createUserId(command.userId),
        organizationId: createOrganizationId(command.organizationId),
        targetCount: command.targetCount,
        standardCount: command.standardCount,
        source: 'cli',
      }),
    );

    this.logger.info('Linter execution tracked successfully');

    return {};
  }
}
