import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IUnlinkGitHubAppInstallationUseCase,
  UnlinkGitHubAppInstallationCommand,
  UnlinkGitHubAppInstallationResponse,
} from '@packmind/types';
import { GitProviderService } from '../../../GitProviderService';

const origin = 'UnlinkGitHubAppInstallationUseCase';

export class UnlinkGitHubAppInstallationUseCase
  extends AbstractAdminUseCase<
    UnlinkGitHubAppInstallationCommand,
    UnlinkGitHubAppInstallationResponse
  >
  implements IUnlinkGitHubAppInstallationUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitProviderService: GitProviderService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: UnlinkGitHubAppInstallationCommand & AdminContext,
  ): Promise<UnlinkGitHubAppInstallationResponse> {
    this.logger.info('Unlinking GitHub App installation');

    const providers =
      await this.gitProviderService.findGitProvidersByOrganizationId(
        command.organization.id,
      );

    const appProvider = providers.find(
      (p) => p.source === 'github' && p.authType === 'github_app',
    );

    if (!appProvider) {
      this.logger.debug('No GitHub App provider found for organization');
      return { unlinked: false };
    }

    await this.gitProviderService.updateGitProvider(appProvider.id, {
      authType: 'pat',
      githubAppInstallationId: null,
      token: null,
    });

    this.logger.info('GitHub App installation unlinked successfully', {
      providerId: appProvider.id,
    });

    return { unlinked: true };
  }
}
