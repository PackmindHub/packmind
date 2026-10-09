import {
  Target,
  createTargetId,
  IAddTargetUseCase,
  AddTargetCommand,
  IGitPort,
  GitProviderMissingTokenError,
  ISyncDistributionsFromLockFilesUseCase,
  OrganizationId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { TargetService } from '../services/TargetService';
import { v4 as uuidv4 } from 'uuid';
import { InvalidTargetPathError } from '../../domain/errors/InvalidTargetPathError';
import { InvalidTargetNameError } from '../../domain/errors/InvalidTargetNameError';
import { GitRepositoryNotFoundError } from '../../domain/errors/GitRepositoryNotFoundError';

const origin = 'AddTargetUseCase';

export class AddTargetUseCase implements IAddTargetUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly gitPort: IGitPort,
    private readonly syncDistributionsFromLockFiles: ISyncDistributionsFromLockFilesUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: AddTargetCommand): Promise<Target> {
    const {
      name,
      path,
      gitRepoId,
      userId,
      organizationId,
      allowTokenlessProvider = false,
    } = command;

    // Validate target name is not empty
    if (!name || name.trim().length === 0) {
      throw new InvalidTargetNameError();
    }

    // Validate path format (basic validation for directory paths)
    if (!path || (path !== '/' && !path.match(new RegExp('\\/.+(?=\\/)\\/')))) {
      throw new InvalidTargetPathError(path);
    }

    // Prevent path traversal attacks
    if (path.includes('..')) {
      throw new InvalidTargetPathError(path);
    }

    // Check if the git provider has a token
    const repo = await this.gitPort.getRepositoryById(gitRepoId);
    if (!repo) {
      throw new GitRepositoryNotFoundError(gitRepoId);
    }

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId: organizationId as OrganizationId,
    });
    const provider = providersResponse.providers.find(
      (p) => p.id === repo.providerId,
    );

    // Business rule: git provider must have working auth configured (unless explicitly allowed)
    if (provider && !provider.hasAuth && !allowTokenlessProvider) {
      throw new GitProviderMissingTokenError(repo.providerId);
    }

    const target: Target = {
      id: createTargetId(uuidv4()),
      name: name.trim(),
      path,
      gitRepoId,
    };

    const addedTarget = await this.targetService.addTarget(target);

    if (repo.isTracked) {
      try {
        await this.syncDistributionsFromLockFiles.execute({
          userId,
          organizationId: organizationId as OrganizationId,
          gitRepoId,
          targetPaths: [addedTarget.path],
        });
      } catch (error) {
        this.logger.warn('Could not sync distribution state from lock files', {
          gitRepoId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return addedTarget;
  }
}
