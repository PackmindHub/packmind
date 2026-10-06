import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  INotifyArtefactsDistribution,
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse,
} from '@packmind/types';
import { LockFileDistributionRecorder } from '../../services/LockFileDistributionRecorder';
import { TargetResolutionService } from '../../services/TargetResolutionService';

const origin = 'NotifyArtefactsDistributionUseCase';

export class NotifyArtefactsDistributionUseCase
  extends AbstractMemberUseCase<
    NotifyArtefactsDistributionCommand,
    NotifyArtefactsDistributionResponse
  >
  implements INotifyArtefactsDistribution
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly targetResolutionService: TargetResolutionService,
    private readonly lockFileDistributionRecorder: LockFileDistributionRecorder,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: NotifyArtefactsDistributionCommand & MemberContext,
  ): Promise<NotifyArtefactsDistributionResponse> {
    const { gitRemoteUrl, gitBranch, relativePath, packmindLockFile } = command;

    this.logger.info('Processing artefacts distribution notification', {
      gitRemoteUrl,
      gitBranch,
      relativePath,
      artifactCount: Object.keys(packmindLockFile.artifacts).length,
    });

    const target =
      await this.targetResolutionService.findOrCreateTargetFromGitInfo(
        command.organization.id,
        command.user.id,
        gitRemoteUrl,
        gitBranch,
        relativePath,
      );

    return this.lockFileDistributionRecorder.record({
      target,
      lockFile: packmindLockFile,
      organizationId: command.organization.id,
      userId: command.user.id,
      source: 'cli',
      branch: gitBranch,
      packageVersions: command.packageVersions,
    });
  }
}
