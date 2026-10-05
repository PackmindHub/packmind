import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { GitProviderService } from '../../GitProviderService';
import {
  GitProviderOrganizationMismatchError,
  GitProviderTokenNotConfiguredError,
  IAccountsPort,
  IListAvailableReposUseCase,
  ListAvailableReposCommand,
  ListAvailableReposResponse,
  MissingGitInputError,
} from '@packmind/types';
import { GitProviderSourceNotConfiguredError } from '../../../domain/errors';

const origin = 'ListAvailableReposUseCase';

export class ListAvailableReposUseCase
  extends AbstractMemberUseCase<
    ListAvailableReposCommand,
    ListAvailableReposResponse
  >
  implements IListAvailableReposUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: ListAvailableReposCommand & MemberContext,
  ): Promise<ListAvailableReposResponse> {
    const { gitProviderId, page, organization, userId } = command;

    if (!gitProviderId) {
      throw new MissingGitInputError('Git provider ID');
    }

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);

    // A provider that does not exist and one owned by another organization are
    // the same answer by design, so they are the same branch.
    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      this.logger.error('Git provider not found in organization', {
        gitProviderId,
        providerOrganizationId: gitProvider?.organizationId ?? null,
        requestedOrganizationId: organization.id,
        userId,
      });
      throw new GitProviderOrganizationMismatchError(
        gitProviderId,
        organization.id,
      );
    }

    // App-auth providers carry no token on the row: the installation token is
    // minted on demand by GithubTokenResolverFactory downstream.
    if (gitProvider.authMethod !== 'app' && !gitProvider.token) {
      throw new GitProviderTokenNotConfiguredError(gitProviderId);
    }

    if (!gitProvider.source) {
      throw new GitProviderSourceNotConfiguredError(gitProviderId);
    }

    return this.gitProviderService.getAvailableRepos(gitProviderId, page ?? 1);
  }
}
