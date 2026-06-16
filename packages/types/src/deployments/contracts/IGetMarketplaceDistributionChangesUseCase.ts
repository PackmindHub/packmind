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

export type GetMarketplaceDistributionChangesCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
  distributionId: MarketplaceDistributionId;
};

export type GetMarketplaceDistributionChangesResponse = SourcePackageChange[];

export type IGetMarketplaceDistributionChangesUseCase = IUseCase<
  GetMarketplaceDistributionChangesCommand,
  GetMarketplaceDistributionChangesResponse
>;
