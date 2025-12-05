import {
  Target,
  createTargetId,
  IAddTargetUseCase,
  AddTargetCommand,
  IGitPort,
  GitProviderMissingTokenError,
  OrganizationId,
} from '@packmind/types';
import { TargetService } from '../services/TargetService';
import { v4 as uuidv4 } from 'uuid';

export class AddTargetUseCase implements IAddTargetUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly gitPort: IGitPort,
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

    // Check if the git provider has a token
    const repo = await this.gitPort.getRepositoryById(gitRepoId);
    if (!repo) {
      throw new Error(`Repository with id ${gitRepoId} not found`);
    }

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId: organizationId as OrganizationId,
    });
    const provider = providersResponse.providers.find(
      (p) => p.id === repo.providerId,
    );

    // Business rule: git provider must have a token configured (unless explicitly allowed)
    if (provider && !provider.hasToken && !allowTokenlessProvider) {
      throw new GitProviderMissingTokenError(repo.providerId);
    }

    const target: Target = {
      id: createTargetId(uuidv4()),
      name: name.trim(),
      path,
      gitRepoId,
    };

    return this.targetService.addTarget(target);
  }
}
