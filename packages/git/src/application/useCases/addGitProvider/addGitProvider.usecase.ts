import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddGitProviderCommand,
  GitProvider,
  IAccountsPort,
  IAddGitProviderUseCase,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { validateProviderCredentials } from '../shared/validateProviderCredentials';

// Re-export for backward compatibility
export { AddGitProviderCommand };

const origin = 'AddGitProviderUseCase';

export class AddGitProviderUseCase
  extends AbstractMemberUseCase<AddGitProviderCommand, GitProvider>
  implements IAddGitProviderUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    private readonly edition: 'cloud' | 'oss' = 'oss',
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: AddGitProviderCommand & MemberContext,
  ): Promise<GitProvider> {
    const {
      gitProvider,
      organization,
      allowTokenlessProvider = false,
    } = command;

    validateProviderCredentials(
      {
        authMethod: gitProvider.authMethod ?? 'token',
        token: gitProvider.token ?? null,
        appInstallationId: gitProvider.appInstallationId ?? null,
        organizationGitHubAppId: gitProvider.organizationGitHubAppId ?? null,
      },
      this.edition,
      { allowTokenless: allowTokenlessProvider },
    );

    if (!gitProvider.source) {
      throw new Error('Git provider source is required');
    }

    const gitProviderWithOrg = {
      ...gitProvider,
      organizationId: organization.id,
    };

    return this.gitProviderService.addGitProvider(gitProviderWithOrg);
  }
}
