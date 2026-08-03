import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetTrackedRepositoryCommand,
  GetTrackedRepositoryResponse,
  IAccountsPort,
  IGetTrackedRepositoryUseCase,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';

const origin = 'GetTrackedRepositoryUseCase';

export class GetTrackedRepositoryUseCase
  extends AbstractMemberUseCase<
    GetTrackedRepositoryCommand,
    GetTrackedRepositoryResponse
  >
  implements IGetTrackedRepositoryUseCase
{
  constructor(
    private readonly gitRepoService: GitRepoService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: GetTrackedRepositoryCommand & MemberContext,
  ): Promise<GetTrackedRepositoryResponse> {
    const { owner, repo, organization } = command;

    const gitRepo =
      await this.gitRepoService.findTrackedByOwnerRepoInOrganization(
        organization.id,
        owner,
        repo,
      );

    return { gitRepo };
  }
}
