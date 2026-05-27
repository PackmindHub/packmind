import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { GithubAppTokenService } from './GithubAppTokenService';
import { GitHubAppConfig, createGitHubAppConfigId } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeRsaKeypair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

function makeConfig(privateKey: string): GitHubAppConfig {
  return {
    id: createGitHubAppConfigId(uuidv4()),
    appId: 12345,
    slug: 'my-app',
    htmlUrl: 'https://github.com/apps/my-app',
    clientId: 'Iv1.abc123',
    clientSecret: 'secret',
    privateKey,
    webhookSecret: 'webhook-secret',
  };
}

describe('GithubAppTokenService', () => {
  let service: GithubAppTokenService;
  let keypair: { privateKey: string; publicKey: string };
  let config: GitHubAppConfig;

  beforeEach(() => {
    keypair = makeRsaKeypair();
    config = makeConfig(keypair.privateKey);
    service = new GithubAppTokenService(stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAppJwt', () => {
    it('signs with RS256 algorithm', () => {
      const token = service.generateAppJwt(config);
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded?.header.alg).toBe('RS256');
    });

    it('sets iss to the appId string', () => {
      const token = service.generateAppJwt(config);
      const payload = jwt.decode(token) as jwt.JwtPayload;
      expect(payload.iss).toBe('12345');
    });

    it('sets iat 60 seconds before now', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = service.generateAppJwt(config);
      const payload = jwt.decode(token) as jwt.JwtPayload;
      expect(payload.iat).toBeLessThanOrEqual(before - 60);
      expect(payload.iat).toBeGreaterThanOrEqual(before - 62);
    });

    it('sets exp approximately 9 minutes after now', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = service.generateAppJwt(config);
      const payload = jwt.decode(token) as jwt.JwtPayload;
      expect(payload.exp).toBeLessThanOrEqual(before + 9 * 60);
      expect(payload.exp).toBeGreaterThanOrEqual(before + 9 * 60 - 2);
    });

    it('produces a verifiable signature', () => {
      const token = service.generateAppJwt(config);
      expect(() =>
        jwt.verify(token, keypair.publicKey, { algorithms: ['RS256'] }),
      ).not.toThrow();
    });
  });

  describe('getInstallationToken', () => {
    const installationId = 42;
    const isoFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    it('returns installation token from GitHub API', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'ghs_token', expires_at: isoFuture },
      });

      const result = await service.getInstallationToken(config, installationId);

      expect(result).toBe('ghs_token');
    });

    it('calls the correct GitHub API endpoint', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'ghs_token', expires_at: isoFuture },
      });

      await service.getInstallationToken(config, installationId);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github+json',
          }),
        }),
      );
    });

    it('uses Bearer authorization header with app JWT', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'ghs_token', expires_at: isoFuture },
      });

      await service.getInstallationToken(config, installationId);

      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2]?.headers as Record<string, string>;
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('returns cached token on second call within TTL', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token: 'ghs_cached', expires_at: isoFuture },
      });

      await service.getInstallationToken(config, installationId);
      const second = await service.getInstallationToken(config, installationId);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(second).toBe('ghs_cached');
    });

    it('fetches a new token after cache expiry', async () => {
      const expiredIso = new Date(Date.now() - 1000).toISOString();

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { token: 'old_token', expires_at: expiredIso },
        })
        .mockResolvedValueOnce({
          data: { token: 'new_token', expires_at: isoFuture },
        });

      await service.getInstallationToken(config, installationId);
      const second = await service.getInstallationToken(config, installationId);

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(second).toBe('new_token');
    });

    it('surfaces network failures to the caller', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(
        service.getInstallationToken(config, installationId),
      ).rejects.toThrow('Network error');
    });
  });
});
