import {
  Target,
  IUpdateTargetUseCase,
  UpdateTargetCommand,
  IGitPort,
  TargetPathUpdateForbiddenError,
  ISyncDistributionsFromLockFilesUseCase,
  OrganizationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { TargetService } from '../services/TargetService';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import { InvalidTargetPathError } from '../../domain/errors/InvalidTargetPathError';
import { InvalidTargetNameError } from '../../domain/errors/InvalidTargetNameError';
import { GitRepositoryNotFoundError } from '../../domain/errors/GitRepositoryNotFoundError';

const origin = 'UpdateTargetUseCase';

export class UpdateTargetUseCase implements IUpdateTargetUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly gitPort: IGitPort,
    private readonly syncDistributionsFromLockFiles: ISyncDistributionsFromLockFilesUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: UpdateTargetCommand): Promise<Target> {
    const { targetId, name, path, userId, organizationId } = command;

    if (!name || name.trim().length === 0) {
      throw new InvalidTargetNameError();
    }

    if (!path || (path !== '/' && !path.match(new RegExp('\\/.+(?=\\/)\\/')))) {
      throw new InvalidTargetPathError(path);
    }

    // Prevent path traversal attacks
    if (path.includes('..')) {
      throw new InvalidTargetPathError(path);
    }

    const currentTarget = await this.targetService.findById(targetId);
    if (!currentTarget) {
      throw new TargetNotFoundError(targetId);
    }

    let syncNewPath = false;
    if (currentTarget.path !== path) {
      const repo = await this.gitPort.getRepositoryById(
        currentTarget.gitRepoId,
      );
      if (!repo) {
        throw new GitRepositoryNotFoundError(currentTarget.gitRepoId);
      }

      const providersResponse = await this.gitPort.listProviders({
        userId,
        organizationId: organizationId as OrganizationId,
      });

      const provider = providersResponse.providers.find(
        (p) => p.id === repo.providerId,
      );

      if (provider && !provider.hasAuth) {
        throw new TargetPathUpdateForbiddenError(targetId);
      }
      syncNewPath = repo.isTracked;
    }

    const updates = {
      name: name.trim(),
      path,
    };

    const updatedTarget = await this.targetService.updateTarget(
      targetId,
      updates,
    );

    if (syncNewPath) {
      try {
        await this.syncDistributionsFromLockFiles.execute({
          userId,
          organizationId: organizationId as OrganizationId,
          gitRepoId: updatedTarget.gitRepoId,
          targetPaths: [updatedTarget.path],
        });
      } catch (error) {
        this.logger.warn('Could not sync distribution state from lock files', {
          gitRepoId: updatedTarget.gitRepoId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return updatedTarget;
  }
}
