import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CheckProviderBranchExistsCommand,
  CheckProviderBranchExistsResponse,
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  ICheckProviderBranchExistsUseCase,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { CheckBranchExistsUseCase } from '../checkBranchExists/CheckBranchExistsUseCase';

const origin = 'CheckProviderBranchExistsUseCase';

export class CheckProviderBranchExistsUseCase
  extends AbstractMemberUseCase<
    CheckProviderBranchExistsCommand,
    CheckProviderBranchExistsResponse
  >
  implements ICheckProviderBranchExistsUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    private readonly checkBranchExists: CheckBranchExistsUseCase,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: CheckProviderBranchExistsCommand & MemberContext,
  ): Promise<CheckProviderBranchExistsResponse> {
    const { gitProviderId, owner, repo, branch, organization } = command;

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

    const exists = await this.checkBranchExists.execute({
      gitProviderId,
      owner,
      repo,
      branch,
    });
    return { exists };
  }
}
