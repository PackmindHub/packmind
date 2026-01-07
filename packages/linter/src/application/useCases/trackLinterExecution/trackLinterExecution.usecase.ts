import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  OrganizationId,
  UserId,
  LinterCalledEvent,
  createGitRepoId,
} from '@packmind/types';

const origin = 'TrackLinterExecutionUseCase';

export interface TrackLinterExecutionCommand {
  organizationId: OrganizationId;
  userId: UserId;
  gitRemoteUrl: string;
  targetCount: number;
  standardCount: number;
}

export class TrackLinterExecutionUseCase {
  constructor(
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: TrackLinterExecutionCommand): Promise<void> {
    this.logger.info('Tracking linter execution', {
      gitRemoteUrl: command.gitRemoteUrl,
      targetCount: command.targetCount,
      standardCount: command.standardCount,
    });

    // Emit domain event for analytics
    // Use gitRemoteUrl as a simple identifier since we don't have the actual GitRepoId
    this.eventEmitterService.emit(
      new LinterCalledEvent({
        userId: createUserId(command.userId),
        organizationId: createOrganizationId(command.organizationId),
        gitRepoId: createGitRepoId(command.gitRemoteUrl),
        targetCount: command.targetCount,
        standardCount: command.standardCount,
      }),
    );

    this.logger.info('Linter execution tracked successfully');
  }
}
