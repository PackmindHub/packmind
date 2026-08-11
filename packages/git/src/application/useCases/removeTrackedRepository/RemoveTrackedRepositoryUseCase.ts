import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createUserId,
  IAccountsPort,
  IRemoveTrackedRepositoryUseCase,
  RemoveTrackedRepositoryCommand,
  RemoveTrackedRepositoryResponse,
  RepositoryNotTrackableError,
  RepositoryTrackingRemovedEvent,
} from '@packmind/types';
import { GitRepoService } from '../../GitRepoService';

const origin = 'RemoveTrackedRepositoryUseCase';

/**
 * Removes Packmind's tracking of a repository. Nothing is deleted: the tracked
 * row keeps its distribution history and only stops being displayed, so
 * re-tracking the same branch brings everything back.
 */
export class RemoveTrackedRepositoryUseCase
  extends AbstractAdminUseCase<
    RemoveTrackedRepositoryCommand,
    RemoveTrackedRepositoryResponse
  >
  implements IRemoveTrackedRepositoryUseCase
{
  constructor(
    private readonly gitRepoService: GitRepoService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    accountsAdapter: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: RemoveTrackedRepositoryCommand & AdminContext,
  ): Promise<RemoveTrackedRepositoryResponse> {
    const { owner, repo, organization, userId } = command;

    const existingTracked =
      await this.gitRepoService.findTrackedByOwnerRepoInOrganization(
        organization.id,
        owner,
        repo,
      );

    if (!existingTracked) {
      // Nothing tracked. Distinguish "connected but not governed" — a warning
      // the caller can ignore, and safe to repeat — from a repository Packmind
      // has never seen, which is a mistake worth failing on.
      const knownRepo =
        await this.gitRepoService.findByOwnerAndRepoInOrganization(
          owner,
          repo,
          organization.id,
        );

      if (!knownRepo) {
        this.logger.warn('Tracking removal targets an unknown repository', {
          organizationId: organization.id,
          owner,
          repo,
        });
        throw new RepositoryNotTrackableError(owner, repo);
      }

      this.logger.info('Repository is not tracked — nothing to remove', {
        organizationId: organization.id,
        owner,
        repo,
      });
      return { status: 'not-tracked', organizationName: organization.name };
    }

    const branch = existingTracked.branch;
    const gitRepo = await this.gitRepoService.markTrackingRemoved(
      existingTracked.id,
    );

    this.eventEmitterService.emit(
      new RepositoryTrackingRemovedEvent({
        userId: createUserId(userId),
        organizationId: organization.id,
        source: command.source ?? 'cli',
        repositoryId: gitRepo.id,
        owner,
        repo,
        branch,
      }),
    );

    this.logger.info('Repository tracking removed', {
      organizationId: organization.id,
      owner,
      repo,
      branch,
      repositoryId: gitRepo.id,
    });

    return { status: 'removed', gitRepo };
  }
}
