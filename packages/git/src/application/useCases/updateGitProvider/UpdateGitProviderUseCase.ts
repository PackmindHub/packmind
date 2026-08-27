import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GitProvider,
  GitProviderDisplayNameNotEditableError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  IUpdateGitProviderUseCase,
  UpdateGitProviderCommand,
  UpdateGitProviderResponse,
} from '@packmind/types';
import { GitProviderService } from '../../GitProviderService';
import { GithubAppMode } from '../../../infra/repositories/github/auth/GithubTokenResolverFactory';
import { validateProviderCredentials } from '../shared/validateProviderCredentials';
import {
  ensureDisplayNameAvailable,
  normalizeDisplayName,
} from '../shared/validateDisplayName';
import { providerHasAuth } from '../shared/providerAuthState';
import {
  assertCandidateCredentialsWork,
  isProbeableSource,
} from '../shared/probeCandidateCredentials';

const origin = 'UpdateGitProviderUseCase';

export class UpdateGitProviderUseCase
  extends AbstractAdminUseCase<
    UpdateGitProviderCommand,
    UpdateGitProviderResponse
  >
  implements IUpdateGitProviderUseCase
{
  constructor(
    private readonly gitProviderService: GitProviderService,
    accountsAdapter: IAccountsPort,
    private readonly mode: GithubAppMode = 'on-prem',
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
  }

  protected async executeForAdmins(
    command: UpdateGitProviderCommand & AdminContext,
  ): Promise<UpdateGitProviderResponse> {
    const { id, gitProvider, organization } = command;

    // Business rule: id is required
    if (!id) {
      throw new Error('Git provider ID is required');
    }

    // Business rule: gitProvider update data is required
    if (!gitProvider || Object.keys(gitProvider).length === 0) {
      throw new Error('Git provider update data is required');
    }

    const existingProvider =
      await this.gitProviderService.findGitProviderById(id);

    if (!existingProvider) {
      throw new GitProviderNotFoundError(id);
    }

    if (existingProvider.organizationId !== organization.id) {
      throw new GitProviderOrganizationMismatchError(id, organization.id);
    }

    if (
      gitProvider.organizationId &&
      gitProvider.organizationId !== existingProvider.organizationId
    ) {
      throw new GitProviderOrganizationMismatchError(id, organization.id);
    }

    // displayName edits are forbidden on CLI-managed providers; guard before
    // credential validation so the surfaced error reflects the actual constraint
    // rather than a downstream "token required" check.
    if (
      gitProvider.displayName !== undefined &&
      !providerHasAuth(existingProvider)
    ) {
      throw new GitProviderDisplayNameNotEditableError(id);
    }

    const nextAuthMethod =
      gitProvider.authMethod ?? existingProvider.authMethod;
    const isSwitchingMethod =
      gitProvider.authMethod !== undefined &&
      gitProvider.authMethod !== existingProvider.authMethod;

    const credentialView = isSwitchingMethod
      ? {
          authMethod: nextAuthMethod,
          token: gitProvider.token ?? null,
          appInstallationId: gitProvider.appInstallationId ?? null,
          organizationGitHubAppId: gitProvider.organizationGitHubAppId ?? null,
        }
      : {
          authMethod: nextAuthMethod,
          token: gitProvider.token ?? existingProvider.token ?? null,
          appInstallationId:
            gitProvider.appInstallationId ??
            existingProvider.appInstallationId ??
            null,
          organizationGitHubAppId:
            gitProvider.organizationGitHubAppId ??
            existingProvider.organizationGitHubAppId ??
            null,
        };

    validateProviderCredentials(credentialView, this.mode);

    const patch: Partial<Omit<GitProvider, 'id'>> = { ...gitProvider };

    if (gitProvider.displayName !== undefined) {
      const normalizedDisplayName = normalizeDisplayName(
        gitProvider.displayName,
      );

      if (
        normalizedDisplayName !== existingProvider.displayName &&
        normalizedDisplayName.length > 0
      ) {
        const siblings =
          await this.gitProviderService.findGitProvidersByOrganizationId(
            existingProvider.organizationId,
          );
        ensureDisplayNameAvailable(
          normalizedDisplayName,
          existingProvider.organizationId,
          siblings,
          id,
        );
      }

      patch.displayName = normalizedDisplayName;
    }

    // The re-authentication panel promises the token is validated against the
    // instance before it replaces the stored one, but nothing above this line
    // ever contacts the provider — validateProviderCredentials only checks that
    // the credential fields are coherent. Probe a supplied token for real, so a
    // dead one is refused instead of being saved and reported as accepted.
    //
    // Deliberately narrow: it fires only when the caller actually sends a token
    // and the connection ends up token-authenticated. A rename sends no token,
    // and a GitHub App rebind resolves to authMethod 'app', so neither pays for
    // a network round trip nor gains a new way to fail. It also runs last, after
    // the local and display-name checks, so a request that fails anyway never
    // reaches the provider.
    const suppliedToken = gitProvider.token;
    if (
      typeof suppliedToken === 'string' &&
      suppliedToken.length > 0 &&
      credentialView.authMethod === 'token' &&
      isProbeableSource(gitProvider.source ?? existingProvider.source)
    ) {
      await assertCandidateCredentialsWork(
        this.gitProviderService,
        {
          ...existingProvider,
          ...patch,
          token: suppliedToken,
        },
        this.logger,
      );
    }

    return this.gitProviderService.updateGitProvider(id, patch);
  }
}
