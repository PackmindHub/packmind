import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GitProviderListItem,
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

    const providerListItems: GitProviderListItem[] = providers.map(
      (provider) => {
        const { token, ...rest } = provider;
        const hasPatToken =
          token !== null && token !== undefined && token.length > 0;
        // TypeORM returns the `bigint` app_installation_id column as a string,
        // so check presence instead of `typeof === 'number'`.
        const hasActiveAppInstallation =
          rest.authMethod === 'app' &&
          rest.appInstallationId !== undefined &&
          rest.appInstallationId !== null &&
          !rest.revokedAt;
        return {
          ...rest,
          hasAuth: hasPatToken || hasActiveAppInstallation,
          authMethod: rest.authMethod,
          // The Deployments-aware enrichment happens at the API service
          // layer where both ports are available; this use case stays in
          // its Git-only domain boundary.
          lastDeploymentAt: null,
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
