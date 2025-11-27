import {
  GetAvailableProvidersCommand,
  GetAvailableProvidersResponse,
  IGetAvailableProvidersUseCase,
  IAccountsPort,
  LLM_PROVIDER_METADATA,
  LLMProvider,
  ProviderMetadata,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';

const origin = 'GetAvailableProvidersUseCase';

export class GetAvailableProvidersUseCase
  extends AbstractMemberUseCase<
    GetAvailableProvidersCommand,
    GetAvailableProvidersResponse
  >
  implements IGetAvailableProvidersUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: GetAvailableProvidersCommand & MemberContext,
  ): Promise<GetAvailableProvidersResponse> {
    this.logger.info('Getting available LLM providers', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    const providers = this.getFilteredProviders();

    this.logger.info('Retrieved available providers', {
      organizationId: command.organizationId,
      count: providers.length,
    });

    return {
      providers,
    };
  }

  private getFilteredProviders(): ProviderMetadata[] {
    const isOssMode = process.env.PACKMIND_EDITION !== 'proprietary';
    const allProviders = Object.values(LLM_PROVIDER_METADATA);

    if (isOssMode) {
      return allProviders.filter(
        (provider) => provider.id !== LLMProvider.PACKMIND,
      );
    }

    return allProviders;
  }
}
