import { PackmindLogger } from '@packmind/logger';
import {
  AbstractAdminUseCase,
  AdminContext,
  Configuration,
} from '@packmind/node-utils';
import {
  BuildGitHubAppManifestCommand,
  BuildGitHubAppManifestResponse,
  IBuildGitHubAppManifestUseCase,
  IAccountsPort,
} from '@packmind/types';
import { GitHubAppManifestStateService } from '../../../services/GitHubAppManifestStateService';

const origin = 'BuildGitHubAppManifestUseCase';

export class BuildGitHubAppManifestUseCase
  extends AbstractAdminUseCase<
    BuildGitHubAppManifestCommand,
    BuildGitHubAppManifestResponse
  >
  implements IBuildGitHubAppManifestUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly manifestStateService: GitHubAppManifestStateService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: BuildGitHubAppManifestCommand & AdminContext,
  ): Promise<BuildGitHubAppManifestResponse> {
    void command;
    const appName =
      (await Configuration.getConfig('PACKMIND_GITHUB_APP_NAME')) || 'packmind';
    const appWebUrl = await Configuration.getConfig('APP_WEB_URL');
    if (!appWebUrl) {
      throw new Error(
        'APP_WEB_URL must be configured to build a GitHub App manifest',
      );
    }

    const state = this.manifestStateService.issue();

    const manifest = {
      name: appName,
      url: appWebUrl,
      redirect_url: `${appWebUrl}/integrations/github-app/manifest-callback`,
      setup_url: `${appWebUrl}/integrations/github-app/install-callback`,
      setup_on_update: true,
      hook_attributes: {
        url: `${appWebUrl}/api/v0/hooks/github-app`,
      },
      public: false,
      default_permissions: {
        contents: 'write' as const,
        metadata: 'read' as const,
        pull_requests: 'write' as const,
      },
      default_events: ['push'],
    };

    this.logger.info('GitHub App manifest built');

    return {
      manifest,
      state,
      manifestPostUrl: 'https://github.com/settings/apps/new',
    };
  }
}
