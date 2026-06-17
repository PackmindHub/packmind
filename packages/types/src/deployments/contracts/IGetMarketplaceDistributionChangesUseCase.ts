import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';

export type SourcePackageChangeKind = 'added' | 'updated' | 'removed';

/**
 * Marketplace-facing artifact taxonomy used by the plugin detail "Changes"
 * tab. Maps Packmind's domain artifacts (recipes / standards / skills) onto
 * the vocabulary the marketplace prototype exposes to organisation members.
 */
export type MarketplaceArtifactKind = 'command' | 'standard' | 'skill';

/**
 * One artifact-level change between what a distribution captured at publish
 * time and what the source package currently looks like. Surfaced as a flat
 * list by `GetMarketplaceDistributionChangesUseCase`.
 *
 * `publishedVersion` is `null` for added artifacts; `currentVersion` is `null`
 * for removed artifacts. For updated artifacts both fields are populated.
 */
export type SourcePackageChange = {
  kind: SourcePackageChangeKind;
  artifactKind: MarketplaceArtifactKind;
  name: string;
  slug: string;
  publishedVersion: number | null;
  currentVersion: number | null;
};

/**
 * Where the source package sits relative to what is published on the
 * marketplace. Drives the Changes-tab action button:
 *
 *  - `in_sync_main`  → no action button (already on the marketplace's
 *    default branch).
 *  - `in_sync_pr`    → "View pull request" — every source change is already
 *    captured by the open sync PR; the user just needs to wait for the
 *    review/merge.
 *  - `outdated_pr`   → "Publish" — a sync PR is open but the source has
 *    drifted further since it was opened; publishing amends the PR.
 *  - `outdated_main` → "Publish" — no sync PR currently includes this
 *    package; publishing opens (or amends) one.
 */
export type SourcePackagePublishState =
  | 'in_sync_main'
  | 'in_sync_pr'
  | 'outdated_pr'
  | 'outdated_main';

export type GetMarketplaceDistributionChangesCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
  distributionId: MarketplaceDistributionId;
};

/**
 * View state for the Changes tab. `changes` is the diff between the source
 * package and the latest *success* baseline (i.e. what's actually live on
 * the marketplace's default branch) — that's the natural list to surface,
 * regardless of whether an intermediate PR is open. `prUrl` is populated
 * when a sync PR currently includes this package.
 */
export type GetMarketplaceDistributionChangesResponse = {
  state: SourcePackagePublishState;
  changes: SourcePackageChange[];
  prUrl: string | null;
};

export type IGetMarketplaceDistributionChangesUseCase = IUseCase<
  GetMarketplaceDistributionChangesCommand,
  GetMarketplaceDistributionChangesResponse
>;
