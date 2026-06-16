import { MarketplaceId } from '@packmind/types';
import { TestApp } from './TestApp';

/**
 * Minimal shape of the reconciliation job the integration tests drive inline.
 */
interface ReconciliationJobHandle {
  reconcileNow: (marketplaceId: MarketplaceId) => Promise<unknown>;
}

/**
 * Reaches the `MarketplaceReconciliationDelayedJob` instance hanging off the
 * deployments adapter's link use case — the same instance specs already stub
 * `scheduleRecurring`/`addJob` on.
 */
function getReconciliationJob(testApp: TestApp): ReconciliationJobHandle {
  return (
    testApp.deploymentsHexa.getAdapter() as unknown as {
      _linkMarketplaceUseCase: { reconciliationJob: ReconciliationJobHandle };
    }
  )._linkMarketplaceUseCase.reconciliationJob;
}

/**
 * Runs a reconciliation sweep inline for a marketplace, mirroring the
 * member-triggered "Sync now" action and the BullMQ worker.
 *
 * Since the Jun-2026 refactor, `publishPackageOnMarketplace` lands the
 * distribution in `pending_merge`; the reconciliation job confirms it to
 * `success` once the published lock entry's content hash is present on the
 * default branch. Specs that assert the post-merge `success` state must
 * therefore drive a reconciliation after publishing, exactly as production
 * does once the rolling sync PR merges.
 *
 * The served `packmind-lock.json` must contain the published plugin's entry
 * (matching the distribution's `contentHash`) for the confirmation to fire.
 */
export async function runMarketplaceReconciliation(
  testApp: TestApp,
  marketplaceId: MarketplaceId,
): Promise<void> {
  await getReconciliationJob(testApp).reconcileNow(marketplaceId);
}
