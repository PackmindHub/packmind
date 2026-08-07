import {
  AcceptMarketplaceDriftResponse,
  AutoLinkMarketplaceCommand,
  AutoLinkMarketplaceResponse,
  FindMarketplaceDistributionByIdResponse,
  GetLastMarketplaceDistributionDateByProvidersCommand,
  GetLastMarketplaceDistributionDateByProvidersResponse,
  GetMarketplaceDistributionChangesResponse,
  IMarketplacePort,
  LinkMarketplaceResponse,
  ListMarketplaceDistributionsForPackageCommand,
  ListMarketplaceDistributionsForPackageResponse,
  ListMarketplaceDistributionsResponse,
  ListMarketplacePluginInstallsResponse,
  ListMarketplacesCommand,
  ListMarketplacesResponse,
  MarkPluginForRemovalResponse,
  PublishPackageOnMarketplaceResponse,
  SyncMarketplaceNowResponse,
  TrackPluginInstallHeartbeatResponse,
  UnlinkMarketplaceResponse,
  UpdateMarketplaceFacesResponse,
  ValidateMarketplaceUrlResponse,
} from '@packmind/types';

export class MarketplacesAdapter implements IMarketplacePort {
  /**
   * OSS edition: repositories are never marketplaces, so shared flows
   * (e.g. git repo auto-detection) fall through to the standard path.
   */
  async autoLinkMarketplace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: AutoLinkMarketplaceCommand,
  ): Promise<AutoLinkMarketplaceResponse> {
    return { outcome: 'not-a-marketplace' };
  }

  linkMarketplace(): Promise<LinkMarketplaceResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  unlinkMarketplace(): Promise<UnlinkMarketplaceResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  async listMarketplaces(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: ListMarketplacesCommand,
  ): Promise<ListMarketplacesResponse> {
    return [];
  }

  validateMarketplaceUrl(): Promise<ValidateMarketplaceUrlResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  publishPackageOnMarketplace(): Promise<PublishPackageOnMarketplaceResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  async listMarketplaceDistributionsForPackage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: ListMarketplaceDistributionsForPackageCommand,
  ): Promise<ListMarketplaceDistributionsForPackageResponse> {
    return [];
  }

  findMarketplaceDistributionById(): Promise<FindMarketplaceDistributionByIdResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  markPluginForRemoval(): Promise<MarkPluginForRemovalResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  syncMarketplaceNow(): Promise<SyncMarketplaceNowResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  acceptMarketplaceDrift(): Promise<AcceptMarketplaceDriftResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  updateMarketplaceFaces(): Promise<UpdateMarketplaceFacesResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  listMarketplaceDistributions(): Promise<ListMarketplaceDistributionsResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  getMarketplaceDistributionChanges(): Promise<GetMarketplaceDistributionChangesResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  trackPluginInstallHeartbeat(): Promise<TrackPluginInstallHeartbeatResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  listMarketplacePluginInstalls(): Promise<ListMarketplacePluginInstallsResponse> {
    throw new Error('Marketplaces are not available in the OSS edition.');
  }

  async getLastMarketplaceDistributionDateByProviders(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _command: GetLastMarketplaceDistributionDateByProvidersCommand,
  ): Promise<GetLastMarketplaceDistributionDateByProvidersResponse> {
    return { datesByProviderId: {} };
  }
}
