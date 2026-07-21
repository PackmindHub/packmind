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
  ISetTrackedRepositoryUseCase,
  RepositoryAlreadyTrackedError,
  RepositoryTrackingSetEvent,
  SetTrackedRepositoryCommand,
  SetTrackedRepositoryResponse,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';
import { isCliRepoTrackingEnabled } from '../shared/cliRepoTrackingFlag';

const origin = 'SetTrackedRepositoryUseCase';

export class SetTrackedRepositoryUseCase
  extends AbstractAdminUseCase<
    SetTrackedRepositoryCommand,
    SetTrackedRepositoryResponse
  >
  implements ISetTrackedRepositoryUseCase
{
  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly findOrCreateGitRepo: IFindOrCreateGitRepoUseCase,
    private readonly eventEmitterService: PackmindEventEmitterService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: SetTrackedRepositoryCommand & AdminContext,
  ): Promise<SetTrackedRepositoryResponse> {
    const {
      owner,
      repo,
      branch,
      origin: trackingOrigin,
      providerVendor,
      gitRemoteUrl,
      organization,
      user,
      userId,
    } = command;

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

    if (existingTracked) {
      // Idempotent: the requested branch is already tracked.
      if (existingTracked.branch === branch) {
        this.logger.info('Repository already tracked on requested branch', {
          organizationId: organization.id,
          owner,
          repo,
          branch,
        });
        return existingTracked;
      }

      // A different branch is tracked — init/track never moves tracking.
      this.logger.warn('Repository already tracked on a different branch', {
        organizationId: organization.id,
        owner,
        repo,
        trackedBranch: existingTracked.branch,
        requestedBranch: branch,
      });
      throw new RepositoryAlreadyTrackedError(
        owner,
        repo,
        existingTracked.branch,
      );
    }

    // Nothing tracked yet — find or create the repo row for the branch and mark
    // it tracked.
    const gitRepo = await this.findOrCreateGitRepo.execute({
      userId,
      organizationId: organization.id,
      owner,
      repo,
      branch,
      providerVendor,
      gitRemoteUrl,
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
        origin: trackingOrigin,
      }),
    );

    this.logger.info('Repository tracking set', {
      organizationId: organization.id,
      owner,
      repo,
      branch,
      origin: trackingOrigin,
      repositoryId: tracked.id,
    });

    return tracked;
  }
}
