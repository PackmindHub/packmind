import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  GitProvider,
  GitProviderDisplayNameNotEditableError,
  GitProviderOrganizationMismatchError,
  IAccountsPort,
  IUpdateGitProviderUseCase,
  MissingGitInputError,
  UpdateGitProviderCommand,
  UpdateGitProviderResponse,
  providerHasAuth,
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

    if (!id) {
      throw new MissingGitInputError('Git provider ID');
    }

    if (!gitProvider || Object.keys(gitProvider).length === 0) {
      throw new MissingGitInputError('Git provider update data');
    }

    const existingProvider =
      await this.gitProviderService.findGitProviderById(id);

    // A provider that does not exist and one owned by another organization are
    // the same answer by design, so they are the same branch.
    if (
      !existingProvider ||
      existingProvider.organizationId !== organization.id
    ) {
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

    // A stored token that cannot be decrypted reads as null, yet a token is
    // still configured: a rename must not be refused for lacking one.
    const keepsUnreadableToken =
      !isSwitchingMethod &&
      existingProvider.tokenUnreadable === true &&
      gitProvider.token === undefined;

    validateProviderCredentials(credentialView, this.mode, {
      allowTokenless: keepsUnreadableToken,
    });

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

    // Nothing above this line contacts the provider — validateProviderCredentials
    // only checks that the credential fields are coherent — yet the
    // re-authentication panel promises the token was validated against the
    // instance. So probe it for real, narrowly: only a caller-supplied token on
    // a token-authenticated connection, and only last, so a rename, an App
    // rebind, or a request that fails anyway never pays a round trip.
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
