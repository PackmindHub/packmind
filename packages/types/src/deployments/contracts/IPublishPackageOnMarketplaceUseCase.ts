import { IUseCase, PackmindCommand } from '../../UseCase';
import { DistributionSource } from '../Distribution';
import { MarketplaceDistributionId } from '../MarketplaceDistributionId';
import { MarketplaceId } from '../MarketplaceId';
import { PackageId } from '../Package';

/**
 * Command issued by an org member to publish a Packmind package as a managed
 * plugin on a linked marketplace.
 *
 * The publish use case extends `AbstractMemberUseCase` — any member of the
 * organization owning both the marketplace and the package can trigger it.
 *
 * `distributionSource` defaults to `'app'` when omitted, mirroring the
 * convention used by the code-repository distribution pipeline. It is
 * distinct from `PackmindCommand.source` (`PackmindEventSource`), which
 * already disambiguates UI/CLI/MCP call sites for analytics events.
 */
export type PublishPackageOnMarketplaceCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  distributionSource?: DistributionSource;
};

/**
 * Response returned by `IPublishPackageOnMarketplaceUseCase`.
 *
 * The use case is asynchronous-by-handoff: it persists an `in_progress`
 * marketplace distribution row, enqueues the BullMQ publish job, and returns
 * the freshly created row identifier so the frontend can poll for the final
 * status (success / failure / no_changes).
 */
export type PublishPackageOnMarketplaceResponse = {
  marketplaceDistributionId: MarketplaceDistributionId;
  status: 'in_progress';
  marketplaceId: MarketplaceId;
  packageId: PackageId;
  pluginSlug: string;
};

export type IPublishPackageOnMarketplaceUseCase = IUseCase<
  PublishPackageOnMarketplaceCommand,
  PublishPackageOnMarketplaceResponse
>;

/**
 * Command used by the controller's polling endpoint to look up a single
 * `MarketplaceDistribution` row by id, scoped to the caller's organization.
 */
export type FindMarketplaceDistributionByIdCommand = PackmindCommand & {
  marketplaceDistributionId: MarketplaceDistributionId;
};
