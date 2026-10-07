import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GitRepo,
  hasRecordedPackageVersions,
  IAccountsPort,
  IGitPort,
  ISyncDistributionsFromLockFilesUseCase,
  LockFileTargetSyncResult,
  NoTrackedRepositoryError,
  PACKMIND_LOCK_FILE_NAME,
  PackmindFileConfig,
  PackmindLockFile,
  SyncDistributionsFromLockFilesCommand,
  SyncDistributionsFromLockFilesResponse,
  Target,
} from '@packmind/types';
import { GitRepositoryNotFoundError } from '../../../domain/errors/GitRepositoryNotFoundError';
import { LockFileDistributionRecorder } from '../../services/LockFileDistributionRecorder';
import { TargetService } from '../../services/TargetService';

const origin = 'SyncDistributionsFromLockFilesUseCase';

export class SyncDistributionsFromLockFilesUseCase
  extends AbstractMemberUseCase<
    SyncDistributionsFromLockFilesCommand,
    SyncDistributionsFromLockFilesResponse
  >
  implements ISyncDistributionsFromLockFilesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitPort: IGitPort,
    private readonly targetService: TargetService,
    private readonly lockFileDistributionRecorder: LockFileDistributionRecorder,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: SyncDistributionsFromLockFilesCommand & MemberContext,
  ): Promise<SyncDistributionsFromLockFilesResponse> {
    const repositories = await this.gitPort.getOrganizationRepositories(
      command.organization.id,
    );
    const requested = repositories.find(
      (repo) => repo.id === command.gitRepoId,
    );
    if (!requested) {
      throw new GitRepositoryNotFoundError(command.gitRepoId);
    }
    const gitRepo = repositories.find(
      (repo) =>
        repo.isTracked &&
        repo.owner === requested.owner &&
        repo.repo === requested.repo &&
        repo.providerId === requested.providerId,
    );
    if (!gitRepo) {
      throw new NoTrackedRepositoryError(requested.owner, requested.repo);
    }

    const targets = await this.targetService.getTargetsByGitRepoId(gitRepo.id);

    const results: LockFileTargetSyncResult[] = [];
    for (const target of targets) {
      const result = await this.syncTarget(gitRepo, target, command);
      if (result) {
        results.push(result);
      }
    }

    this.logger.info('Synced distribution state from lock files', {
      gitRepoId: gitRepo.id,
      targetCount: targets.length,
      updatedCount: results.filter((r) => r.status === 'updated').length,
    });

    return { targets: results };
  }

  private async syncTarget(
    gitRepo: GitRepo,
    target: Target,
    command: SyncDistributionsFromLockFilesCommand & MemberContext,
  ): Promise<LockFileTargetSyncResult | null> {
    const lockFile = await this.readJsonFile(
      gitRepo,
      target,
      PACKMIND_LOCK_FILE_NAME,
      isPackmindLockFile,
    );
    if (!lockFile) {
      return null;
    }

    if (!hasRecordedPackageVersions(lockFile)) {
      return {
        targetId: target.id,
        path: target.path,
        status: 'ignored',
        warnings: [{ type: 'lock_from_older_cli' }],
      };
    }

    const packmindJson = await this.readJsonFile(
      gitRepo,
      target,
      'packmind.json',
      isPackmindFileConfig,
    );

    const { status, warnings } = await this.lockFileDistributionRecorder.record(
      {
        target,
        lockFile,
        organizationId: command.organization.id,
        userId: command.user.id,
        source: 'app',
        branch: gitRepo.branch,
        packageVersions: packmindJson?.packages,
      },
    );

    return { targetId: target.id, path: target.path, status, warnings };
  }

  private async readJsonFile<T>(
    gitRepo: GitRepo,
    target: Target,
    fileName: string,
    isExpectedShape: (value: unknown) => value is T,
  ): Promise<T | null> {
    const file = await this.gitPort.getFileFromRepo(
      gitRepo,
      `${target.path.slice(1)}${fileName}`,
    );
    if (!file) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(file.content);
      return isExpectedShape(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPackmindLockFile(value: unknown): value is PackmindLockFile {
  return (
    isRecord(value) &&
    typeof value['lockfileVersion'] === 'number' &&
    Array.isArray(value['packageSlugs']) &&
    Array.isArray(value['agents']) &&
    isRecord(value['artifacts'])
  );
}

function isPackmindFileConfig(value: unknown): value is PackmindFileConfig {
  return isRecord(value) && isRecord(value['packages']);
}
