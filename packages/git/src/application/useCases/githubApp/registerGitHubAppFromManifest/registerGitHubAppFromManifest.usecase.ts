import axios from 'axios';
import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  AppAlreadyRegisteredError,
  IAccountsPort,
  IRegisterGitHubAppFromManifestUseCase,
  InvalidManifestStateError,
  RegisterGitHubAppFromManifestCommand,
  RegisterGitHubAppFromManifestResponse,
} from '@packmind/types';
import { IGitHubAppConfigRepository } from '../../../../domain/repositories/IGitHubAppConfigRepository';
import { GitHubAppManifestStateService } from '../../../services/GitHubAppManifestStateService';

const origin = 'RegisterGitHubAppFromManifestUseCase';

type GitHubAppConversionResponse = {
  id: number;
  slug: string;
  html_url: string;
  client_id: string;
  client_secret: string;
  pem: string;
  webhook_secret: string;
};

export class RegisterGitHubAppFromManifestUseCase
  extends AbstractAdminUseCase<
    RegisterGitHubAppFromManifestCommand,
    RegisterGitHubAppFromManifestResponse
  >
  implements IRegisterGitHubAppFromManifestUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly gitHubAppConfigRepository: IGitHubAppConfigRepository,
    private readonly manifestStateService: GitHubAppManifestStateService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: RegisterGitHubAppFromManifestCommand & AdminContext,
  ): Promise<RegisterGitHubAppFromManifestResponse> {
    const { code, state } = command;

    const isValid = this.manifestStateService.consume(state);
    if (!isValid) {
      throw new InvalidManifestStateError();
    }

    const existing = await this.gitHubAppConfigRepository.findActive();
    if (existing) {
      throw new AppAlreadyRegisteredError();
    }

    const { data } = await axios.post<GitHubAppConversionResponse>(
      `https://api.github.com/app-manifests/${code}/conversions`,
      null,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      },
    );

    const saved = await this.gitHubAppConfigRepository.save({
      appId: data.id,
      slug: data.slug,
      htmlUrl: data.html_url,
      clientId: data.client_id,
      clientSecret: data.client_secret,
      privateKey: data.pem,
      webhookSecret: data.webhook_secret,
    });

    this.logger.info('GitHub App registered from manifest', {
      slug: saved.slug,
    });

    return {
      id: saved.id,
      appId: saved.appId,
      slug: saved.slug,
      htmlUrl: saved.htmlUrl,
      clientId: saved.clientId,
    };
  }
}
