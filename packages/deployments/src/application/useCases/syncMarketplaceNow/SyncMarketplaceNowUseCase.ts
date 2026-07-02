import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  ISyncMarketplaceNowUseCase,
  MarketplaceNotFoundError,
  SyncMarketplaceNowCommand,
  SyncMarketplaceNowResponse,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { MarketplaceReconciliationDelayedJob } from '../../jobs/MarketplaceReconciliationDelayedJob';

const origin = 'SyncMarketplaceNowUseCase';

/** Skip a re-fetch when the row was validated within this window (debounces rapid page reopens). */
const RECONCILE_FRESHNESS_WINDOW_MS = 10_000;

/**
 * Runs an immediate reconciliation of a single marketplace and returns the
 * resulting state. Member-scoped stop-gap that lets an org member refresh a
 * marketplace on demand instead of waiting up to ~30 min for the next cron
 * sweep — most visibly, so a merged deletion PR flips `to_be_removed`
 * distributions to `removed` right away.
 *
 * The reconciliation is non-destructive: it only syncs Packmind's view to the
 * repo's reality (drift detection + terminal `removed` transitions), so it
 * needs no admin privilege.
 *
 * Flow:
 *  1. Resolve the marketplace by `(organizationId, marketplaceId)`. Miss →
 *     `MarketplaceNotFoundError`.
 *  2. Run the reconciliation sweep synchronously via the reconciliation job's
 *     `reconcileNow`.
 *  3. Return the resulting `{ state, lastValidatedAt }`.
 */
export class SyncMarketplaceNowUseCase
  extends AbstractMemberUseCase<
    SyncMarketplaceNowCommand,
    SyncMarketplaceNowResponse
  >
  implements ISyncMarketplaceNowUseCase
{
  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly reconciliationJob: MarketplaceReconciliationDelayedJob,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: SyncMarketplaceNowCommand & MemberContext,
  ): Promise<SyncMarketplaceNowResponse> {
    const { marketplaceId, organization } = command;

    this.logger.info('Manual marketplace reconciliation requested', {
      marketplaceId,
      organizationId: organization.id,
      actorId: command.user.id,
    });

    const marketplace =
      await this.marketplaceRepository.findByOrganizationAndId(
        organization.id,
        marketplaceId,
      );
    if (!marketplace) {
      this.logger.warn('Marketplace not found for manual reconciliation', {
        marketplaceId,
        organizationId: organization.id,
        actorId: command.user.id,
      });
      throw new MarketplaceNotFoundError(marketplaceId);
    }

    const isFresh =
      marketplace.lastValidatedAt != null &&
      Date.now() - new Date(marketplace.lastValidatedAt).getTime() <
        RECONCILE_FRESHNESS_WINDOW_MS;

    if (isFresh) {
      this.logger.info('Marketplace recently validated — skipping reconcile', {
        marketplaceId,
        organizationId: organization.id,
      });
      return {
        state: marketplace.state,
        lastValidatedAt: marketplace.lastValidatedAt as Date,
        errorKind: marketplace.errorKind,
        errorDetail: marketplace.errorDetail,
        pendingPrUrl: marketplace.pendingPrUrl,
        outdatedPluginSlugs: marketplace.outdatedPluginSlugs,
      };
    }

    const result = await this.reconciliationJob.reconcileNow(marketplaceId);

    this.logger.info('Manual marketplace reconciliation completed', {
      marketplaceId,
      organizationId: organization.id,
      actorId: command.user.id,
      state: result.state,
    });

    return result;
  }
}
