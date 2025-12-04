import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListProvidersUseCase,
  ListProvidersCommand,
  ListProvidersResponse,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';

const origin = 'ListProvidersUseCase';

export class ListProvidersUseCase
  extends AbstractMemberUseCase<ListProvidersCommand, ListProvidersResponse>
  implements IListProvidersUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitProviderService: GitProviderService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    logger.info('ListProvidersUseCase initialized');
  }

  async executeForMembers(
    command: ListProvidersCommand & MemberContext,
  ): Promise<ListProvidersResponse> {
    this.logger.info('Fetching git providers for organization', {
      organizationId: command.organizationId,
    });

    const providers =
      await this.gitProviderService.findGitProvidersByOrganizationId(
        command.organization.id,
      );

    const providersWithoutToken = providers.map(({ token, ...provider }) => ({
      ...provider,
      hasToken: token !== null && token !== undefined && token.length > 0,
    }));

    this.logger.info('Git providers fetched successfully', {
      organizationId: command.organizationId,
      providerCount: providersWithoutToken.length,
    });

    return { providers: providersWithoutToken };
  }
}
