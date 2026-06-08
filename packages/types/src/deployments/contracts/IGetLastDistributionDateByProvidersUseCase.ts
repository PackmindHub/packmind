import { GitProviderId } from '../../git/GitProvider';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type GetLastDistributionDateByProvidersCommand = PackmindCommand & {
  providerIds: GitProviderId[];
};

export type GetLastDistributionDateByProvidersResponse = {
  /**
   * Keyed by GitProviderId. Providers with no successful distribution are
   * absent — callers treat absence as "never distributed".
   */
  datesByProviderId: Record<string, string>;
};

export type IGetLastDistributionDateByProvidersUseCase = IUseCase<
  GetLastDistributionDateByProvidersCommand,
  GetLastDistributionDateByProvidersResponse
>;
