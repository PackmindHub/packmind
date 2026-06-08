import { GitProviderId } from '../../git/GitProvider';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type GetLastDeploymentDateByProvidersCommand = PackmindCommand & {
  providerIds: GitProviderId[];
};

export type GetLastDeploymentDateByProvidersResponse = {
  /**
   * Keyed by GitProviderId. Providers with no successful distribution are
   * absent — callers treat absence as "never deployed".
   */
  datesByProviderId: Record<string, string>;
};

export type IGetLastDeploymentDateByProvidersUseCase = IUseCase<
  GetLastDeploymentDateByProvidersCommand,
  GetLastDeploymentDateByProvidersResponse
>;
