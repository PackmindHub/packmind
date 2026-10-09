import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createUserId,
  IAccountsPort,
  IDeploymentPort,
  IFindOrCreateGitRepoUseCase,
  ISetTrackedRepositoryUseCase,
  RepositoryAlreadyTrackedError,
  RepositoryTrackingSetEvent,
  SetTrackedRepositoryCommand,
  SetTrackedRepositoryResponse,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GitRepoService } from '../../GitRepoService';
import { findByOwnerReadings } from '../shared/findByOwnerReadings';

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
    private readonly gitProviderService: GitProviderService,
    private readonly findOrCreateGitRepo: IFindOrCreateGitRepoUseCase,
    private readonly eventEmitterService: PackmindEventEmitterService,
    accountsAdapter: IAccountsPort,
    private readonly deploymentsAdapter: IDeploymentPort,
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
      userId,
    } = command;
    // A remote cloned from an instance installed under a path prefix carries
    // that prefix before the group; its repository may be recorded without it.
    const ownerReadings = await this.gitProviderService.ownerReadings(
      organization.id,
      owner,
      gitRemoteUrl,
    );
    const existingTracked = await findByOwnerReadings(
      ownerReadings,
      (ownerReading, opts) =>
        this.gitRepoService.findTrackedByOwnerRepoInOrganization(
          organization.id,
          ownerReading,
          repo,
          opts,
        ),
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

    try {
      await this.deploymentsAdapter.syncDistributionsFromLockFiles({
        userId: createUserId(userId),
        organizationId: organization.id,
        gitRepoId: tracked.id,
      });
    } catch (error) {
      this.logger.warn('Could not sync distribution state from lock files', {
        gitRepoId: tracked.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return tracked;
  }
}
