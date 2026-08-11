import { SpaceColor } from '../../spaces/SpaceColor';
import { SpaceId } from '../../spaces/SpaceId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistribution } from '../MarketplaceDistribution';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Presentation DTO enriching a domain `MarketplaceDistribution` with the
 * Packmind package name, the display name of the author who originally
 * published the plugin, and the owning Space (id, name, palette color).
 * Expressed as an intersection so structural drift on the domain type is
 * caught at compile time per `standard-typescript-good-practices.md`.
 *
 * `space` is `null` when the source package or its space can no longer be
 * resolved (either was hard-deleted out from under the distribution row).
 *
 * `lastPublishedOnMainAt` is the `publishConfirmedAt` of the most recent
 * `success` distribution for this package on this marketplace, regardless of
 * whether the latest row itself is `success` or `pending_merge`. This lets
 * the UI keep showing "last published Xd ago" while a new PR is in flight,
 * and tell apart a never-landed-on-main first publish from a re-publish.
 * Null when no `success` has ever landed for this package.
 *
 * `sourcePackagePublishable` reflects the source package's CURRENT
 * composition (≥1 skill or recipe), not the publish-time snapshot. It is
 * `false` once the package has been edited down to standards-only (or the
 * package was hard-deleted), so the UI can hide the re-publish/sync action and
 * steer the user to "Remove" instead.
 *
 * `revision` is the published content revision derived from the distribution's
 * `versionFingerprint` (`buildVersionRevision`). The frontend marks an install
 * outdated when its reported `installedRevision` differs from this value. Null
 * for distributions published before fingerprints existed (→ drift cannot be
 * determined; installs fall back to count-only display).
 */
export type MarketplaceDistributionListItem = MarketplaceDistribution & {
  packageName: string;
  packageSlug: string;
  authorName: string;
  space: {
    id: SpaceId;
    slug: string;
    name: string;
    color: SpaceColor;
  } | null;
  lastPublishedOnMainAt: Date | null;
  sourcePackagePublishable: boolean;
  revision: string | null;
};

/**
 * Command used by any organization member to list the distributions for a
 * given marketplace owned by the caller's organization.
 */
export type ListMarketplaceDistributionsCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
};

export type ListMarketplaceDistributionsResponse =
  MarketplaceDistributionListItem[];

export type IListMarketplaceDistributionsUseCase = IUseCase<
  ListMarketplaceDistributionsCommand,
  ListMarketplaceDistributionsResponse
>;
