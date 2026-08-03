import { GitProviderId } from '../../git/GitProvider';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type GetLastMarketplaceDistributionDateByProvidersCommand =
  PackmindCommand & {
    providerIds: GitProviderId[];
  };

export type GetLastMarketplaceDistributionDateByProvidersResponse = {
  /**
   * Keyed by GitProviderId. Providers with no successful marketplace
   * distribution are absent — callers treat absence as "never published".
   */
  datesByProviderId: Record<string, string>;
};

export type IGetLastMarketplaceDistributionDateByProvidersUseCase = IUseCase<
  GetLastMarketplaceDistributionDateByProvidersCommand,
  GetLastMarketplaceDistributionDateByProvidersResponse
>;
