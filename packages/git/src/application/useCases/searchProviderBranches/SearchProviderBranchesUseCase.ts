import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  ISearchProviderBranchesUseCase,
  SearchProviderBranchesCommand,
  SearchProviderBranchesResponse,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';

const origin = 'SearchProviderBranchesUseCase';

const MAX_BRANCHES = 20;

export class SearchProviderBranchesUseCase
  extends AbstractMemberUseCase<
    SearchProviderBranchesCommand,
    SearchProviderBranchesResponse
  >
  implements ISearchProviderBranchesUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: SearchProviderBranchesCommand & MemberContext,
  ): Promise<SearchProviderBranchesResponse> {
    const { gitProviderId, owner, repo, search, organization } = command;

    const gitProvider =
      await this.gitProviderService.findGitProviderById(gitProviderId);

    // A provider that does not exist and one owned by another organization
    // get the same answer, so an id from another tenant cannot be confirmed.
    if (!gitProvider || gitProvider.organizationId !== organization.id) {
      throw new GitProviderOrganizationMismatchError(
        gitProviderId,
        organization.id,
      );
    }

    const branches = await this.gitProviderService.searchBranches(
      gitProviderId,
      owner,
      repo,
      search.trim(),
      MAX_BRANCHES,
    );
    return { branches };
  }
}
