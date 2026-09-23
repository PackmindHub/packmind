import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  DeleteGitProviderCommand,
  DeleteGitProviderResponse,
  GitProviderHasRepositoriesError,
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  IDeleteGitProviderUseCase,
  MissingGitInputError,
  createUserId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

const origin = 'DeleteGitProviderUseCase';

export class DeleteGitProviderUseCase
  extends AbstractAdminUseCase<
    DeleteGitProviderCommand,
    DeleteGitProviderResponse
  >
  implements IDeleteGitProviderUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly gitRepoService: GitRepoService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: DeleteGitProviderCommand & AdminContext,
  ): Promise<DeleteGitProviderResponse> {
    const { id, userId, force = false, organization } = command;

    if (!id) {
      throw new MissingGitInputError('Git provider ID');
    }

    const gitProvider = await this.gitProviderService.findGitProviderById(id);

    // A provider that does not exist and one owned by another organization are
    // the same answer by design, so they are the same branch.
    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      this.logger.error('Git provider not found in organization', {
        gitProviderId: id,
        providerOrganizationId: gitProvider?.organizationId,
        requestedOrganizationId: organization.id,
        userId,
      });
      throw new GitProviderOrganizationMismatchError(id, organization.id);
    }

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

    if (dependentRepos.length > 0 && force) {
      for (const repo of dependentRepos) {
        await this.gitRepoService.deleteGitRepo(repo.id, createUserId(userId));
      }
    }

    await this.gitProviderService.deleteGitProvider(id, createUserId(userId));

    return {};
  }
}
