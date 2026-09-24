import { IUseCase, PackmindCommand } from '../../UseCase';
import { DistributionSource } from '../../deployments/Distribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../../deployments/Package';
import { PackageReleaseId } from '../../deployments/PackageRelease';

/**
 * Member-scoped: any member of the organization owning both the marketplace and
 * the package can trigger a publish.
 *
 * `distributionSource` defaults to `'app'` when omitted, mirroring the
 * code-repository distribution pipeline. It is NOT `PackmindCommand.source`
 * (`PackmindEventSource`), which separately disambiguates UI/CLI/MCP call sites
 * for analytics events.
 */
export type PublishPackageOnMarketplaceCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  distributionSource?: DistributionSource;
  version?: string;
};

/**
 * Asynchronous by handoff: the use case persists an `in_progress` row, enqueues
 * the BullMQ publish job, and returns that row's id — hence the hardcoded
 * `status`. The frontend polls for the terminal success / failure / no_changes.
 */
export type PublishPackageOnMarketplaceResponse = {
  marketplaceDistributionId: MarketplaceDistributionId;
  status: 'in_progress';
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  pluginSlug: string;
  /** The package version being distributed; null when distributing the live package. */
  packageRelease: {
    id: PackageReleaseId;
    version: string;
    componentsCount: number;
  } | null;
};

export type IPublishPackageOnMarketplaceUseCase = IUseCase<
  PublishPackageOnMarketplaceCommand,
  PublishPackageOnMarketplaceResponse
>;
