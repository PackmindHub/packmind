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
import { findByOwnerReadings } from '../shared/findByOwnerReadings';

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
    const { owner, repo, organization } = command;
    // A remote cloned from an instance installed under a path prefix carries
    // that prefix before the group; its repository may be recorded without it.
    const ownerReadings = await this.gitProviderService.ownerReadings(
      organization.id,
      owner,
    );
    const gitRepo = await findByOwnerReadings(
      ownerReadings,
      (ownerReading, opts) =>
        this.gitRepoService.findTrackedByOwnerRepoInOrganization(
          organization.id,
          ownerReading,
          repo,
          opts,
        ),
    );

    return { gitRepo };
  }
}
