import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createUserId,
  IAccountsPort,
  IGitPort,
  IUnlinkMarketplaceUseCase,
  MarketplaceNotFoundError,
  MarketplaceUnlinkedEvent,
  UnlinkMarketplaceCommand,
  UnlinkMarketplaceResponse,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { MarketplaceReconciliationDelayedJob } from '../../jobs/MarketplaceReconciliationDelayedJob';

const origin = 'UnlinkMarketplaceUseCase';

/**
 * Unlinks a marketplace from the caller's organization.
 *
 * Admin-only. The underlying Git repository is **never** touched — only the
 * `Marketplace` row and its supporting `type='marketplace'` `GitRepo` row are
 * soft-deleted. In-flight PRs are unaffected.
 *
 * Flow:
 *  1. Find the marketplace by `(organizationId, marketplaceId)`.
 *     Miss → `MarketplaceNotFoundError`.
 *  2. Soft-delete the `Marketplace` row.
 *  3. Soft-delete the underlying marketplace-typed `GitRepo` via `IGitPort`.
 *  4. (Group K, task 11.3) Remove the repeatable reconciliation job.
 *  5. Emit `MarketplaceUnlinkedEvent`.
 *  6. Return `{ marketplaceId }`.
 */
export class UnlinkMarketplaceUseCase
  extends AbstractAdminUseCase<
    UnlinkMarketplaceCommand,
    UnlinkMarketplaceResponse
  >
  implements IUnlinkMarketplaceUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly gitPort: IGitPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly reconciliationJob: MarketplaceReconciliationDelayedJob,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: UnlinkMarketplaceCommand & AdminContext,
  ): Promise<UnlinkMarketplaceResponse> {
    const { marketplaceId, organization, userId, source } = command;

    if (!marketplaceId) {
      throw new Error('Marketplace ID is required');
    }

    // 1. Find by (orgId, marketplaceId) — soft-deleted rows are excluded.
    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      this.logger.warn('Marketplace not found for unlink', {
        marketplaceId,
        organizationId: organization.id,
      });
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    // 2. Soft-delete the Marketplace row.
    await this.marketplaceRepository.deleteById(marketplaceId, userId);

    // 3. Soft-delete the underlying marketplace-typed GitRepo. Packmind never
    // touches the Git repo itself — this only marks the row as deleted so it
    // stops appearing in marketplace listings and so the coords can be
    // re-linked later.
    await this.gitPort.deleteGitRepo(
      marketplace.gitRepoId,
      createUserId(userId),
      organization.id,
    );

    // 4. Cancel the BullMQ repeatable reconciliation cron for this
    //    marketplace so the worker stops polling once the row is gone. The
    //    underlying removeRepeatable is a no-op if no schedule exists, and
    //    we swallow errors so a scheduler hiccup never blocks the unlink.
    try {
      await this.reconciliationJob.cancelRecurring(marketplace.id);
    } catch (error) {
      this.logger.error(
        'Failed to cancel marketplace reconciliation cron — the schedule may continue running until the row is hard-deleted',
        {
          marketplaceId: marketplace.id,
          organizationId: organization.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // 5. Emit MarketplaceUnlinkedEvent.
    this.eventEmitterService.emit(
      new MarketplaceUnlinkedEvent({
        userId: createUserId(userId),
        organizationId: organization.id,
        marketplaceId: marketplace.id,
        gitRepoId: marketplace.gitRepoId,
        source: source ?? 'ui',
      }),
    );

    return { marketplaceId: marketplace.id };
  }
}
