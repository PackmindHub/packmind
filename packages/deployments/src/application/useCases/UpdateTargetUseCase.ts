import {
  Target,
  IUpdateTargetUseCase,
  UpdateTargetCommand,
  IGitPort,
  TargetPathUpdateForbiddenError,
  OrganizationId,
} from '@packmind/types';
import { TargetService } from '../services/TargetService';

export class UpdateTargetUseCase implements IUpdateTargetUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly gitPort: IGitPort,
  ) {}

  async execute(command: UpdateTargetCommand): Promise<Target> {
    const { targetId, name, path, userId, organizationId } = command;

    if (!name || name.trim().length === 0) {
      throw new Error('Target name cannot be empty');
    }

    if (!path || (path !== '/' && !path.match(new RegExp('\\/.+(?=\\/)\\/')))) {
      throw new Error('Invalid path format');
    }

    // Prevent path traversal attacks
    if (path.includes('..')) {
      throw new Error('Invalid path format');
    }

    const currentTarget = await this.targetService.findById(targetId);
    if (!currentTarget) {
      throw new Error(`Target with id ${targetId} not found`);
    }

    if (currentTarget.path !== path) {
      const repo = await this.gitPort.getRepositoryById(
        currentTarget.gitRepoId,
      );
      if (!repo) {
        throw new Error(
          `Repository with id ${currentTarget.gitRepoId} not found`,
        );
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
    }

    const updates = {
      name: name.trim(),
      path,
    };

    return this.targetService.updateTarget(targetId, updates);
  }
}
