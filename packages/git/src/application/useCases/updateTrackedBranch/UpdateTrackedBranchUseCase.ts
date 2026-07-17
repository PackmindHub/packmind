import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createUserId,
  IAccountsPort,
  IFindOrCreateGitRepoUseCase,
  IUpdateTrackedBranchUseCase,
  NoTrackedRepositoryError,
  RepositoryAlreadyTrackedError,
  RepositoryTrackingSetEvent,
  UpdateTrackedBranchCommand,
  UpdateTrackedBranchResponse,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { isCliRepoTrackingEnabled } from '../shared/cliRepoTrackingFlag';

const origin = 'UpdateTrackedBranchUseCase';

export class UpdateTrackedBranchUseCase
  extends AbstractAdminUseCase<
    UpdateTrackedBranchCommand,
    UpdateTrackedBranchResponse
  >
  implements IUpdateTrackedBranchUseCase
{
  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly gitProviderService: GitProviderService,
    private readonly findOrCreateGitRepo: IFindOrCreateGitRepoUseCase,
    private readonly eventEmitterService: PackmindEventEmitterService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: UpdateTrackedBranchCommand & AdminContext,
  ): Promise<UpdateTrackedBranchResponse> {
    const { owner, repo, branch, organization, user, userId } = command;

    // Feature-flag guard (defense-in-depth; the API route returns 404 when off).
    const enabled = await isCliRepoTrackingEnabled({ userEmail: user.email });
    if (!enabled) {
      throw new Error('cli-repo-tracking feature is not enabled');
    }

    const existingTracked =
      await this.gitRepoService.findTrackedByOwnerRepoInOrganization(
        organization.id,
        owner,
        repo,
      );

    // Nothing tracked yet — the caller must init/track first.
    if (!existingTracked) {
      this.logger.warn('No tracked repository to update', {
        organizationId: organization.id,
        owner,
        repo,
      });
      throw new NoTrackedRepositoryError(owner, repo);
    }

    // Requested branch already tracked — nothing to move.
    if (existingTracked.branch === branch) {
      this.logger.warn('Requested branch is already tracked', {
        organizationId: organization.id,
        owner,
        repo,
        branch,
      });
      throw new RepositoryAlreadyTrackedError(
        owner,
        repo,
        existingTracked.branch,
      );
    }

    const fromBranch = existingTracked.branch;

    // Resolve the vendor/url of the currently tracked repo's provider so the
    // new-branch repo is resolved/created under the same provider.
    const provider = await this.gitProviderService.findGitProviderById(
      existingTracked.providerId,
    );

    // Clear-then-set = last-one-wins (plain update, no locking).
    await this.gitRepoService.updateTracked(existingTracked.id, false);

    const gitRepo = await this.findOrCreateGitRepo.execute({
      userId,
      organizationId: organization.id,
      owner,
      repo,
      branch,
      providerVendor: provider?.source,
      gitRemoteUrl: provider?.url ?? undefined,
    });

    const tracked = await this.gitRepoService.updateTracked(gitRepo.id, true);

    this.eventEmitterService.emit(
      new RepositoryTrackingSetEvent({
        userId: createUserId(userId),
        organizationId: organization.id,
        source: command.source ?? 'cli',
        repositoryId: tracked.id,
        owner,
        repo,
        branch,
        origin: 'track',
        fromBranch,
      }),
    );

    this.logger.info('Tracked branch updated', {
      organizationId: organization.id,
      owner,
      repo,
      fromBranch,
      toBranch: branch,
      repositoryId: tracked.id,
    });

    return tracked;
  }
}
