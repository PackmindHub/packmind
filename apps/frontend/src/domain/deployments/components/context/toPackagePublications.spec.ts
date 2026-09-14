import {
  MarketplaceDistributionStatus,
  createMarketplaceId,
  createPackageId,
} from '@packmind/types';
import type { MarketplacePublication } from '@packmind/proprietary/frontend/domain/marketplaces/components/usePackageMarketplacePublications';
import type { MarketplaceDrift } from '../redesign/types';
import { toPackagePublications } from './toPackagePublications';

const PACKAGE_ID = createPackageId('pkg-1');
const OTHER_PACKAGE_ID = createPackageId('pkg-2');

function publication(
  overrides: Partial<{
    marketplaceId: string;
    name: string;
    status: MarketplaceDistributionStatus;
    prUrl: string | undefined;
    lastPublishedOnMainAt: Date | null;
  }> = {},
): MarketplacePublication {
  const {
    marketplaceId = 'mkt-1',
    name = 'Acme catalog',
    status = MarketplaceDistributionStatus.success,
    prUrl,
    lastPublishedOnMainAt = new Date('2026-09-01T10:00:00.000Z'),
  } = overrides;

  return {
    marketplace: { id: createMarketplaceId(marketplaceId), name },
    distribution: { status, prUrl, lastPublishedOnMainAt },
  } as unknown as MarketplacePublication;
}

function drift(
  marketplaceId: string,
  packageId = PACKAGE_ID,
  prUrl: string | null = null,
): MarketplaceDrift {
  return {
    id: createMarketplaceId(marketplaceId),
    name: 'Acme catalog',
    plugins: [
      {
        pluginSlug: 'plugin-1',
        packageId,
        packageName: 'Package',
        lastStatus: null,
        prUrl,
      },
    ],
    publishedPackageNames: [],
  };
}

describe('toPackagePublications', () => {
  describe('when the space drift holds this package on that marketplace', () => {
    it('reports the copy as outdated', () => {
      const [row] = toPackagePublications(
        [publication()],
        [drift('mkt-1')],
        PACKAGE_ID,
      );

      expect(row.isOutdated).toBe(true);
    });
  });

  describe('when the drift is about another package', () => {
    it('leaves the copy up to date', () => {
      const [row] = toPackagePublications(
        [publication()],
        [drift('mkt-1', OTHER_PACKAGE_ID)],
        PACKAGE_ID,
      );

      expect(row.isOutdated).toBe(false);
    });
  });

  describe('when no drift mentions the marketplace at all', () => {
    it('leaves the copy up to date', () => {
      const [row] = toPackagePublications(
        [publication()],
        [drift('mkt-other')],
        PACKAGE_ID,
      );

      expect(row.isOutdated).toBe(false);
    });
  });

  it.each([
    [MarketplaceDistributionStatus.failure, 'failed'],
    [MarketplaceDistributionStatus.pending_merge, 'waiting'],
    [MarketplaceDistributionStatus.in_progress, 'waiting'],
    [MarketplaceDistributionStatus.to_be_removed, 'waiting'],
    [MarketplaceDistributionStatus.success, 'landed'],
  ])('reads %s as %s', (status, expected) => {
    const [row] = toPackagePublications(
      [publication({ status })],
      [],
      PACKAGE_ID,
    );

    expect(row.lastAttempt).toBe(expected);
  });

  describe('when the distribution carries no pull request', () => {
    /*
     * The drifted plugin is the second place the sync PR is named, and it is
     * the one that survives a distribution row the reconciliation sweep has
     * moved on from.
     */
    it('falls back to the one the drift names', () => {
      const [row] = toPackagePublications(
        [publication({ status: MarketplaceDistributionStatus.pending_merge })],
        [drift('mkt-1', PACKAGE_ID, 'https://github.com/acme/one/pull/4')],
        PACKAGE_ID,
      );

      expect(row.prUrl).toBe('https://github.com/acme/one/pull/4');
    });
  });

  describe('when both name a pull request', () => {
    it('keeps the distribution one', () => {
      const [row] = toPackagePublications(
        [
          publication({
            status: MarketplaceDistributionStatus.pending_merge,
            prUrl: 'https://github.com/acme/one/pull/9',
          }),
        ],
        [drift('mkt-1', PACKAGE_ID, 'https://github.com/acme/one/pull/4')],
        PACKAGE_ID,
      );

      expect(row.prUrl).toBe('https://github.com/acme/one/pull/9');
    });
  });

  describe('when nothing has ever landed on main', () => {
    it('reports no activity rather than an epoch', () => {
      const [row] = toPackagePublications(
        [publication({ lastPublishedOnMainAt: null })],
        [],
        PACKAGE_ID,
      );

      expect(row.lastActivityAt).toBeNull();
    });
  });

  it('states the date as an ISO string', () => {
    const [row] = toPackagePublications([publication()], [], PACKAGE_ID);

    expect(row.lastActivityAt).toBe('2026-09-01T10:00:00.000Z');
  });
});
