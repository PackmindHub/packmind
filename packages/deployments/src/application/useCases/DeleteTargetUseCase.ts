import {
  IDeleteTargetUseCase,
  DeleteTargetCommand,
  DeleteTargetResponse,
  IGitPort,
  GitProviderMissingTokenError,
  OrganizationId,
} from '@packmind/types';
import { TargetService } from '../services/TargetService';

export class DeleteTargetUseCase implements IDeleteTargetUseCase {
  constructor(
    private readonly targetService: TargetService,
    private readonly gitPort: IGitPort,
  ) {}

  async execute(command: DeleteTargetCommand): Promise<DeleteTargetResponse> {
    const { targetId, userId, organizationId } = command;

    // Get the target to find its repository
    const target = await this.targetService.findById(targetId);
    if (!target) {
      throw new Error(`Target with id ${targetId} not found`);
    }

    // Check if the git provider has a token
    const repo = await this.gitPort.getRepositoryById(target.gitRepoId);
    if (!repo) {
      throw new Error(`Repository with id ${target.gitRepoId} not found`);
    }

    const providersResponse = await this.gitPort.listProviders({
      userId,
      organizationId: organizationId as OrganizationId,
    });
    const provider = providersResponse.providers.find(
      (p) => p.id === repo.providerId,
    );

    if (provider && !provider.hasToken) {
      throw new GitProviderMissingTokenError(repo.providerId);
    }

    await this.targetService.deleteTarget(targetId);

    return { success: true };
  }
}
