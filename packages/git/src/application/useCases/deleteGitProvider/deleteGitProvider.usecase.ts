import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { GitProviderId } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { PackmindCommand, IAccountsPort, createUserId } from '@packmind/types';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GitProviderNotFoundError,
  GitProviderHasRepositoriesError,
  GitProviderOrganizationMismatchError,
} from '@packmind/types';

const origin = 'DeleteGitProviderUseCase';

export type DeleteGitProviderCommand = PackmindCommand & {
  id: GitProviderId;
  force?: boolean;
};

type DeleteGitProviderResult = Record<string, never>;

export class DeleteGitProviderUseCase extends AbstractAdminUseCase<
  DeleteGitProviderCommand,
  DeleteGitProviderResult
> {
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: DeleteGitProviderCommand & AdminContext,
  ): Promise<DeleteGitProviderResult> {
    const { id, userId, force = false, organization } = command;

    // Business rule: provider ID is required
    if (!id) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: provider must exist
    const gitProvider = await this.gitProviderService.findGitProviderById(id);
    if (!gitProvider) {
      this.logger.error('Git provider not found', {
        gitProviderId: id,
        userId,
        organizationId: organization.id,
      });
      throw new GitProviderNotFoundError(id);
    }

    if (gitProvider.organizationId !== organization.id) {
      this.logger.error('Git provider does not belong to organization', {
        gitProviderId: id,
        providerOrganizationId: gitProvider.organizationId,
        requestedOrganizationId: organization.id,
        userId,
      });
      throw new GitProviderOrganizationMismatchError(id, organization.id);
    }

    // Business rule: check for dependent repositories before deletion
    const dependentRepos =
      await this.gitRepoService.findGitReposByProviderId(id);
    if (dependentRepos.length > 0 && !force) {
      this.logger.error(
        'Cannot delete git provider with associated repositories',
        {
          gitProviderId: id,
          userId,
          repositoryCount: dependentRepos.length,
          repositoryIds: dependentRepos.map((repo) => repo.id),
          organizationId: gitProvider.organizationId,
        },
      );
      throw new GitProviderHasRepositoriesError(id, dependentRepos.length);
    }

    // Business rule: if force deletion, remove all dependent repositories first
    if (dependentRepos.length > 0 && force) {
      for (const repo of dependentRepos) {
        await this.gitRepoService.deleteGitRepo(repo.id, createUserId(userId));
      }
    }

    // Delete the git provider
    await this.gitProviderService.deleteGitProvider(id, createUserId(userId));

    return {};
  }
}
