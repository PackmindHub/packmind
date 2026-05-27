import jwt from 'jsonwebtoken';
import axios from 'axios';
import { GitHubAppConfig } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';

const origin = 'GithubAppTokenService';

type CachedToken = {
  token: string;
  expiresAt: Date;
};

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export class GithubAppTokenService {
  private readonly cache = new Map<number, CachedToken>();

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  generateAppJwt(config: GitHubAppConfig): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      iat: nowSeconds - 60,
      exp: nowSeconds + 9 * 60,
      iss: config.appId.toString(),
    };

    return jwt.sign(payload, config.privateKey, { algorithm: 'RS256' });
  }

  async getInstallationToken(
    config: GitHubAppConfig,
    installationId: number,
  ): Promise<string> {
    const cached = this.cache.get(installationId);
    if (cached && cached.expiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
      return cached.token;
    }

    this.logger.info('Fetching GitHub App installation token', {
      installationId,
    });

    const appJwt = this.generateAppJwt(config);

    const response = await axios.post<{ token: string; expires_at: string }>(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: 'application/vnd.github+json',
        },
      },
    );

    const { token, expires_at } = response.data;

    this.cache.set(installationId, {
      token,
      expiresAt: new Date(expires_at),
    });

    return token;
  }
}
