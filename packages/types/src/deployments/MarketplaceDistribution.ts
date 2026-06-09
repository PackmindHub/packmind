import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { WithSoftDelete, WithTimestamps } from '../database/types';
import { DistributionSource } from './Distribution';
import { DistributionStatus } from './DistributionStatus';
import { MarketplaceDistributionId } from './MarketplaceDistributionId';
import { MarketplaceId } from './MarketplaceId';
import { PackageId } from './Package';
import { PublishFailureReason } from './PublishFailureReason';
import { VersionFingerprint } from './VersionFingerprint';

/**
 * Persistent record of a single attempt to publish a Packmind package as a
 * managed plugin on a linked marketplace.
 *
 * Mirrors the code-repository `Distribution` shape so the frontend can
 * surface progress, success, no-op, and failure to the user through the
 * same conceptual model. One row per click — never reused.
 *
 * Soft-delete-aware: rows survive package/marketplace removal for audit.
 */
export type MarketplaceDistribution = WithSoftDelete<
  WithTimestamps<{
    id: MarketplaceDistributionId;
    organizationId: OrganizationId;
    marketplaceId: MarketplaceId;
    packageId: PackageId;
    pluginSlug: string;
    authorId: UserId;
    status: DistributionStatus;
    source: DistributionSource;
    prUrl?: string;
    gitCommit?: string;
    error?: string;
    failureReason?: PublishFailureReason;
    contentHash?: string;
    /** Artifact-version fingerprint captured at publish time; used to flag the marketplace outdated. */
    versionFingerprint?: VersionFingerprint;
  }>
>;
