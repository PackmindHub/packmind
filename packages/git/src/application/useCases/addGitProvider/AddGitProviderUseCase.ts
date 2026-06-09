import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddGitProviderCommand,
  AddGitProviderResponse,
  IAccountsPort,
  IAddGitProviderUseCase,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GithubAppMode } from '../../../infra/repositories/github/auth/GithubTokenResolverFactory';
import { validateProviderCredentials } from '../shared/validateProviderCredentials';
import {
  ensureDisplayNameAvailable,
  normalizeDisplayName,
} from '../shared/validateDisplayName';

// Re-export for backward compatibility
export { AddGitProviderCommand };

const origin = 'AddGitProviderUseCase';

export class AddGitProviderUseCase
  extends AbstractMemberUseCase<AddGitProviderCommand, AddGitProviderResponse>
  implements IAddGitProviderUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    private readonly mode: GithubAppMode = 'on-prem',
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForMembers(
    command: AddGitProviderCommand & MemberContext,
  ): Promise<AddGitProviderResponse> {
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
      this.mode,
      { allowTokenless: allowTokenlessProvider },
    );

    if (!gitProvider.source) {
      throw new Error('Git provider source is required');
    }

    const normalizedDisplayName = normalizeDisplayName(gitProvider.displayName);

    if (normalizedDisplayName.length > 0) {
      const existingProviders =
        await this.gitProviderService.findGitProvidersByOrganizationId(
          organization.id,
        );
      ensureDisplayNameAvailable(
        normalizedDisplayName,
        organization.id,
        existingProviders,
      );
    }

    const gitProviderWithOrg = {
      ...gitProvider,
      displayName: normalizedDisplayName,
      organizationId: organization.id,
    };

    return this.gitProviderService.addGitProvider(gitProviderWithOrg);
  }
}
