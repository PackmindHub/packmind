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
import {
  assertCandidateCredentialsWork,
  isProbeableSource,
} from '../shared/probeCandidateCredentials';

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
      verifyCredentials = false,
    } = command;

    // The route has no runtime DTO validation, so authMethod can genuinely be
    // absent even though the type declares it. Default it once, here, and use
    // that everywhere below.
    const authMethod = gitProvider.authMethod ?? 'token';

    validateProviderCredentials(
      {
        authMethod,
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

    // Same contract as re-authentication: a token the user hands us is checked
    // against the provider before it is stored, so a connection is never created
    // in a state that looks healthy and cannot fetch anything.
    //
    // Only when the caller asked for it, so programmatic creation stays offline:
    // the CLI tracks repositories through deliberately tokenless providers, and
    // the GitHub App callback has no PAT to probe — its installation is the
    // verification.
    if (
      verifyCredentials &&
      authMethod === 'token' &&
      typeof gitProvider.token === 'string' &&
      gitProvider.token.length > 0 &&
      isProbeableSource(gitProvider.source)
    ) {
      // Hand over the same defaulted authMethod the gate just decided on, not
      // the raw payload: the field is optional at runtime (no DTO validation on
      // the route) and the token resolver matches it by strict equality, so an
      // absent one would fall through its branches and abort the probe.
      await assertCandidateCredentialsWork(
        this.gitProviderService,
        {
          ...gitProvider,
          authMethod,
        },
        this.logger,
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
