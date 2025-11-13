import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GitProviderId,
  GitProviderOrganizationMismatchError,
  GitRepoId,
  IAccountsPort,
  PackmindCommand,
  createUserId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

const origin = 'DeleteGitRepoUseCase';

export type DeleteGitRepoCommand = PackmindCommand & {
  repositoryId: GitRepoId;
  providerId?: GitProviderId;
};

type DeleteGitRepoResult = Record<string, never>;

export class DeleteGitRepoUseCase extends AbstractAdminUseCase<
  DeleteGitRepoCommand,
  DeleteGitRepoResult
> {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: DeleteGitRepoCommand & AdminContext,
  ): Promise<DeleteGitRepoResult> {
    const { repositoryId, userId, providerId, organization } = command;

    // Business rule: repository ID is required
    if (!repositoryId) {
      throw new Error('Repository ID is required');
    }

    // Business rule: repository must exist
    const repository = await this.gitRepoService.findGitRepoById(repositoryId);
    if (!repository) {
      throw new Error('Repository not found');
    }

    // Business rule: if providerId is specified, validate ownership
    if (providerId && repository.providerId !== providerId) {
      throw new Error('Repository does not belong to the specified provider');
    }

    // Business rule: validate that the associated provider exists
    const gitProvider = await this.gitProviderService.findGitProviderById(
      repository.providerId,
    );
    if (!gitProvider) {
      throw new Error('Git provider not found for this repository');
    }

    if (gitProvider.organizationId !== organization.id) {
      throw new GitProviderOrganizationMismatchError(
        gitProvider.id,
        organization.id,
      );
    }

    // Delete the repository
    await this.gitRepoService.deleteGitRepo(repositoryId, createUserId(userId));

    return {};
  }
}
