import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  DeleteGitRepoCommand,
  DeleteGitRepoResponse,
  GitProviderOrganizationMismatchError,
  GitRepoNotFoundError,
  IAccountsPort,
  IDeleteGitRepoUseCase,
  MissingGitInputError,
  createUserId,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';

const origin = 'DeleteGitRepoUseCase';

export class DeleteGitRepoUseCase
  extends AbstractAdminUseCase<DeleteGitRepoCommand, DeleteGitRepoResponse>
  implements IDeleteGitRepoUseCase
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
    command: DeleteGitRepoCommand & AdminContext,
  ): Promise<DeleteGitRepoResponse> {
    const { repositoryId, userId, providerId, organization } = command;

    if (!repositoryId) {
      throw new MissingGitInputError('Repository ID');
    }

    // Type-ignoring finder: this use case serves both the standard and the
    // marketplace deletion path, and the default `findGitRepoById` filters
    // marketplace-typed rows out.
    const repository =
      await this.gitRepoService.findGitRepoByIdIgnoringType(repositoryId);

    // A repository addressed through a provider that does not own it is one
    // the caller cannot see through that path, so it answers exactly what a
    // repository that does not exist answers.
    if (!repository || (providerId && repository.providerId !== providerId)) {
      throw new GitRepoNotFoundError(repositoryId);
    }

    const gitProvider = await this.gitProviderService.findGitProviderById(
      repository.providerId,
    );

    // A provider that does not exist and one owned by another organization are
    // the same answer by design, so they are the same branch.
    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      throw new GitProviderOrganizationMismatchError(
        repository.providerId,
        organization.id,
      );
    }

    await this.gitRepoService.deleteGitRepo(repositoryId, createUserId(userId));

    return {};
  }
}
