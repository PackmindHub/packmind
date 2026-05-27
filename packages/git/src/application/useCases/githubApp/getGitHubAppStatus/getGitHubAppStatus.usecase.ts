import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GetGitHubAppStatusCommand,
  GetGitHubAppStatusResponse,
  IAccountsPort,
  IGetGitHubAppStatusUseCase,
} from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';

const origin = 'GetGitHubAppStatusUseCase';

export class GetGitHubAppStatusUseCase
  extends AbstractAdminUseCase<
    GetGitHubAppStatusCommand,
    GetGitHubAppStatusResponse
  >
  implements IGetGitHubAppStatusUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitHubAppConfigRepository: IGitHubAppConfigRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: GetGitHubAppStatusCommand & AdminContext,
  ): Promise<GetGitHubAppStatusResponse> {
    const config = await this.gitHubAppConfigRepository.findActive();

    if (!config) {
      return { registered: false };
    }

    const installUrl = `${config.htmlUrl}/installations/new?state=${command.organizationId}`;

    this.logger.info('GitHub App status retrieved', { slug: config.slug });

    return {
      registered: true,
      slug: config.slug,
      appId: config.appId,
      htmlUrl: config.htmlUrl,
      installUrl,
    };
  }
}
