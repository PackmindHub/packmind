import axios, { AxiosInstance, isAxiosError } from 'axios';
import { createSign } from 'crypto';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { GitProviderId } from '@packmind/types';
import { IGithubTokenResolver } from '../../../../domain/repositories/IGithubTokenResolver';

const origin = 'AppInstallationTokenResolver';

/**
 * Resolver that authenticates as a GitHub App **installation**.
 *
 * Flow:
 *  1. Mint a short-lived RS256 JWT signed with the App's private key
 *     (acts on behalf of the App itself, not any installation).
 *  2. Exchange that JWT for an installation access token via
 *     `POST /app/installations/{installation_id}/access_tokens`.
 *  3. Cache the installation token until shortly before it expires
 *     (GitHub installation tokens live for 1 hour).
 *
 * Revocation handling: we follow a "401-on-next-call" strategy. If any
 * downstream API call returns 401, `onUnauthorized()` is invoked by the
 * Axios response interceptor on `GithubProvider`/`GithubRepository`. We
 * (a) flush the in-memory cache so the next `getToken()` will re-mint
 * and re-exchange, and (b) invoke the optional `onRevoke` callback —
 * which `GithubTokenResolverFactory` wires by default (oss edition) to
 * persist `revoked_at` on the `OrganizationGitHubApp` row, so subsequent
 * `factory.build()` calls fail fast before minting another JWT.
 */
export interface AppInstallationTokenResolverParams {
  providerId: GitProviderId;
  appId: number;
  privateKeyPem: string;
  installationId: number;
  onRevoke?: () => Promise<void>;
}

interface CachedToken {
  value: string;
  expiresAt: number; // unix ms
}

// GitHub installation tokens expire after ~1 hour. Refresh slightly before
// to absorb clock skew between us and api.github.com.
const REFRESH_SAFETY_MARGIN_MS = 60_000; // 60s
const MAX_CACHE_LIFETIME_MS = 50 * 60_000; // 50 minutes hard cap

// GitHub JWTs may live up to 10 minutes. We sign for 9 minutes and back-
// date `iat` by 60s to tolerate clock skew, per GitHub's own recommendation.
const JWT_PAST_TOLERANCE_SECONDS = 60;
const JWT_LIFETIME_SECONDS = 9 * 60;

export class AppInstallationTokenResolver implements IGithubTokenResolver {
  private readonly providerId: GitProviderId;
  private readonly appId: number;
  private readonly privateKeyPem: string;
  private readonly installationId: number;
  private readonly onRevoke?: () => Promise<void>;
  private readonly httpClient: AxiosInstance;
  private cachedToken: CachedToken | null = null;

  constructor(
    params: AppInstallationTokenResolverParams,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
    // Optional override for tests; production code never passes this.
    httpClient?: AxiosInstance,
  ) {
    this.providerId = params.providerId;
    this.appId = params.appId;
    this.privateKeyPem = params.privateKeyPem;
    this.installationId = params.installationId;
    this.onRevoke = params.onRevoke;

    // IMPORTANT: dedicated Axios instance for /app/installations/.../access_tokens.
    // It must NOT share interceptors with GithubProvider/GithubRepository —
    // otherwise a 401 from a downstream API call would recursively trigger
    // a token exchange against the same client, and a 401 from the token
    // exchange itself would loop into our own onUnauthorized() handler.
    this.httpClient =
      httpClient ??
      axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

    this.logger.info('AppInstallationTokenResolver initialized', {
      providerId: this.providerId,
      appId: this.appId,
      installationId: this.installationId,
    });
  }

  async getToken(): Promise<string> {
    if (this.isCacheValid()) {
      this.logger.debug('Returning cached installation token', {
        providerId: this.providerId,
        installationId: this.installationId,
      });
      // Non-null asserted: isCacheValid() guarantees cachedToken !== null.
      return this.cachedToken!.value;
    }

    this.logger.debug('Cache miss — minting new App JWT and exchanging', {
      providerId: this.providerId,
      installationId: this.installationId,
    });

    const jwt = mintAppJwt(this.appId, this.privateKeyPem);
    const { token, expiresAt } =
      await this.exchangeJwtForInstallationToken(jwt);

    this.cachedToken = {
      value: token,
      expiresAt,
    };

    return token;
  }

  async onUnauthorized(): Promise<void> {
    this.logger.warn('401 received — clearing token cache', {
      providerId: this.providerId,
      installationId: this.installationId,
    });
    this.cachedToken = null;

    if (this.onRevoke) {
      // Intentionally not wrapped in try/catch. If persisting revoked_at
      // fails we want the caller (Axios response interceptor in the
      // provider) to see the error.
      await this.onRevoke();
    }
  }

  getKind(): 'installation' {
    return 'installation';
  }

  private isCacheValid(): boolean {
    if (!this.cachedToken) return false;
    return Date.now() < this.cachedToken.expiresAt;
  }

  private async exchangeJwtForInstallationToken(
    jwt: string,
  ): Promise<{ token: string; expiresAt: number }> {
    const url = `/app/installations/${this.installationId}/access_tokens`;
    try {
      const response = await this.httpClient.post<{
        token: string;
        expires_at: string;
      }>(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        },
      );

      const { token, expires_at: expiresAtIso } = response.data;
      if (!token || !expiresAtIso) {
        throw new Error(
          'GitHub access_tokens response missing token or expires_at',
        );
      }

      const githubExpiry = Date.parse(expiresAtIso);
      if (Number.isNaN(githubExpiry)) {
        throw new Error(
          `GitHub access_tokens returned an unparseable expires_at: ${expiresAtIso}`,
        );
      }

      // Pick the earliest of (github expiry - margin) and (now + hard cap).
      const localCap = Date.now() + MAX_CACHE_LIFETIME_MS;
      const safeExpiry = githubExpiry - REFRESH_SAFETY_MARGIN_MS;
      const expiresAt = Math.min(localCap, safeExpiry);

      return { token, expiresAt };
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        this.logger.error('GitHub App installation token exchange failed', {
          providerId: this.providerId,
          installationId: this.installationId,
          status: error.response.status,
          // Body intentionally NOT logged — may contain App-level secrets.
        });
        throw new Error(
          `Failed to exchange App JWT for installation token (status ${error.response.status})`,
        );
      }
      this.logger.error('GitHub App installation token exchange failed', {
        providerId: this.providerId,
        installationId: this.installationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to exchange App JWT for installation token');
    }
  }
}

// ---------------------------------------------------------------------------
// JWT helpers (kept local; only the resolver mints App JWTs today).
// ---------------------------------------------------------------------------

/**
 * Hand-rolled RS256 JWT for the GitHub App, signed with the App's private
 * key. Returned token authenticates as the App (not any installation).
 */
export function mintAppJwt(appId: number, privateKeyPem: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: nowSeconds - JWT_PAST_TOLERANCE_SECONDS,
    exp: nowSeconds + JWT_LIFETIME_SECONDS,
    iss: appId,
  };

  const encodedHeader = base64Url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64Url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem);

  return `${signingInput}.${base64Url(signature)}`;
}

/**
 * Base64url-encode a Buffer per RFC 7515 §C
 * (`+` → `-`, `/` → `_`, strip trailing `=`).
 */
export function base64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
