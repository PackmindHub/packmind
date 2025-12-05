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

    // Validate target name is not empty
    if (!name || name.trim().length === 0) {
      throw new Error('Target name cannot be empty');
    }

    // Validate path format (basic validation for directory paths)
    if (!path || (path !== '/' && !path.match(new RegExp('\\/.+(?=\\/)\\/')))) {
      throw new Error('Invalid path format');
    }

    // Prevent path traversal attacks
    if (path.includes('..')) {
      throw new Error('Invalid path format');
    }

    // Get current target to check if path is being changed
    const currentTarget = await this.targetService.findById(targetId);
    if (!currentTarget) {
      throw new Error(`Target with id ${targetId} not found`);
    }

    // If path is being changed, check if the provider has a token
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

      if (provider && !provider.hasToken) {
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
