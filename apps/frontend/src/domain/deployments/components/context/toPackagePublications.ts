import { MarketplaceDistributionStatus, type PackageId } from '@packmind/types';
import type { MarketplacePublication } from '@packmind/proprietary/frontend/domain/marketplaces/components/usePackageMarketplacePublications';
import type { MarketplaceDrift } from '../redesign/types';
import type { PackagePublication } from './buildPackageDestinations';

/**
 * The publications of this package, in the terms the shared model works in.
 *
 * Two sources meet here. The publication says the package stands on a
 * marketplace and what its last attempt did; the space's drift says whether
 * what stands there has been overtaken since. Neither answers the other's
 * question, and the row needs both.
 *
 * Its own file because it is where a marketplace stops being a marketplace and
 * becomes a row: everything downstream of it works in `PackagePublication`,
 * which names no domain, and everything upstream is the marketplaces domain
 * that only one edition has. Keeping the seam visible is what lets the tab
 * above it be the same file in both editions.
 */
export function toPackagePublications(
  publications: readonly MarketplacePublication[],
  marketplaces: readonly MarketplaceDrift[],
  packageId: PackageId,
): PackagePublication[] {
  const outdated = new Map<string, { prUrl: string | null }>();
  for (const marketplace of marketplaces) {
    const plugin = marketplace.plugins.find(
      (candidate) => candidate.packageId === packageId,
    );
    if (plugin) outdated.set(marketplace.id, { prUrl: plugin.prUrl });
  }

  return publications.map(({ marketplace, distribution }) => {
    const drifted = outdated.get(marketplace.id);
    return {
      id: marketplace.id,
      name: marketplace.name,
      isOutdated: drifted !== undefined,
      lastAttempt: lastAttemptOf(distribution.status),
      prUrl: distribution.prUrl ?? drifted?.prUrl ?? null,
      lastActivityAt: isoOrNull(distribution.lastPublishedOnMainAt),
    };
  });
}

/**
 * What a publish status means to a reader of this list.
 *
 * `to_be_removed` reads as waiting rather than as a state of its own: the
 * package is on its way off that marketplace, the work has been asked for, and
 * there is nothing here for anyone to do about it. The marketplace's own screen
 * is where a removal is watched.
 */
function lastAttemptOf(
  status: MarketplaceDistributionStatus,
): PackagePublication['lastAttempt'] {
  switch (status) {
    case MarketplaceDistributionStatus.failure:
      return 'failed';
    case MarketplaceDistributionStatus.pending_merge:
    case MarketplaceDistributionStatus.in_progress:
    case MarketplaceDistributionStatus.to_be_removed:
      return 'waiting';
    default:
      return 'landed';
  }
}

function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
