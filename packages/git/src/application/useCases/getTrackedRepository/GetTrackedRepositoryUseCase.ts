import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetTrackedRepositoryCommand,
  GetTrackedRepositoryResponse,
  IAccountsPort,
  IGetTrackedRepositoryUseCase,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
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
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: GetTrackedRepositoryCommand & MemberContext,
  ): Promise<GetTrackedRepositoryResponse> {
    const { owner: remoteOwner, repo, organization } = command;
    // A remote cloned from an instance installed under a path prefix carries
    // that prefix before the group; the repository is recorded without it.
    const owner = await this.gitProviderService.ownerAsProvidersNameIt(
      organization.id,
      remoteOwner,
    );

    const gitRepo =
      await this.gitRepoService.findTrackedByOwnerRepoInOrganization(
        organization.id,
        owner,
        repo,
      );

    return { gitRepo };
  }
}
