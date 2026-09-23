import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddGitProviderCommand,
  AddGitProviderResponse,
  IAccountsPort,
  IAddGitProviderUseCase,
  MissingGitInputError,
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
      throw new MissingGitInputError('Git provider source');
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

    // A token is probed before it is stored, so a connection is never created
    // looking healthy while unable to fetch anything. Opt-in, because
    // programmatic creation must stay offline: the CLI tracks repositories
    // through deliberately tokenless providers, and the GitHub App callback has
    // no PAT to probe — its installation is the verification.
    if (
      verifyCredentials &&
      authMethod === 'token' &&
      typeof gitProvider.token === 'string' &&
      gitProvider.token.length > 0 &&
      isProbeableSource(gitProvider.source)
    ) {
      // Pass the defaulted authMethod, not the raw payload: the token resolver
      // matches it by strict equality, so an absent one falls through every
      // branch and aborts the probe.
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
