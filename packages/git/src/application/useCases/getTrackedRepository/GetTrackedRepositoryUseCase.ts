import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetTrackedRepositoryCommand,
  GetTrackedRepositoryResponse,
  IAccountsPort,
  IGetTrackedRepositoryUseCase,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { isCliRepoTrackingEnabled } from '../shared/cliRepoTrackingFlag';

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
    const { owner, repo, organization, user } = command;

    // Feature-flag guard: when disabled, behave as feature-absent (no tracked
    // repository). The API route surfaces this as a 404.
    const enabled = await isCliRepoTrackingEnabled({
      userEmail: user.email,
    });
    if (!enabled) {
      this.logger.info(
        'cli-repo-tracking disabled, returning no tracked repo',
        {
          organizationId: organization.id,
          owner,
          repo,
        },
      );
      return { gitRepo: null };
    }

    const gitRepo =
      await this.gitRepoService.findTrackedByOwnerRepoInOrganization(
        organization.id,
        owner,
        repo,
      );

    return { gitRepo };
  }
}
