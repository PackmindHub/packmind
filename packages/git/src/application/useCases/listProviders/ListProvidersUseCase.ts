import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GitProviderListItem,
  IAccountsPort,
  IListProvidersUseCase,
  ListProvidersCommand,
  ListProvidersResponse,
  toGitProviderWithoutToken,
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

    const providerListItems: GitProviderListItem[] = providers.map(
      (provider) => {
        const tokenless = toGitProviderWithoutToken(provider);
        return {
          ...tokenless,
          // Marketplaces are surfaced by their own API, so they must not
          // inflate the standard repository count.
          repos: (tokenless.repos ?? []).filter(
            (repo) => repo.type === 'standard',
          ),
          // Filled in by the API service layer, which can reach the
          // Deployments port; this use case stays within the Git domain.
          lastDistributionAt: null,
        };
      },
    );

    this.logger.info('Git providers fetched successfully', {
      organizationId: command.organizationId,
      providerCount: providerListItems.length,
    });

    return { providers: providerListItems };
  }
}
