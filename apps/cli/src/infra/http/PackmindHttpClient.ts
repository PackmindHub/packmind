import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import { version } from '../../../package.json';
import { isCommunityEditionError } from '../../domain/errors/CommunityEditionError';
import { PackmindEdition, UserOrganizationRole } from '@packmind/types';
import { parsePackmindEdition, readPackmindEdition } from './packmindEdition';
import { Agent } from 'undici';
import * as tls from 'tls';
import * as fs from 'fs';

function buildDispatcher(): Agent {
  const cas: (string | Buffer)[] = [...tls.rootCertificates];

  const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
  const programFilesX86 =
    process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';

  const systemCertFiles = [
    '/etc/ssl/certs/ca-certificates.crt', // Debian/Ubuntu
    '/etc/ssl/cert.pem', // macOS / Alpine
    '/etc/ssl/certs/ca-bundle.crt', // RHEL / CentOS
    // Git for Windows bundles (most common CA source on Windows)
    `${programFiles}\\Git\\usr\\ssl\\certs\\ca-bundle.crt`,
    `${programFiles}\\Git\\mingw64\\ssl\\certs\\ca-bundle.crt`,
    `${programFilesX86}\\Git\\usr\\ssl\\certs\\ca-bundle.crt`,
    `${programFilesX86}\\Git\\mingw64\\ssl\\certs\\ca-bundle.crt`,
    `D:\\ca-certificates.crt`,
    `/private/etc/ssl/certs/ca-certificates.crt`, // Mac OS
    process.env.NODE_EXTRA_CA_CERTS, // user-defined extra CAs
  ].filter(Boolean) as string[];

  for (const certFile of systemCertFiles) {
    try {
      cas.push(fs.readFileSync(certFile));
    } catch {
      // file absent on this platform — skip
    }
  }

  return new Agent({ connect: { ca: cas } });
}

const dispatcher = buildDispatcher();

interface IAuthContext {
  host: string;
  jwt: string;
  organizationId: string;
  role: UserOrganizationRole | null;
}

interface IRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  onError?: (response: Response, edition: PackmindEdition | null) => void;
}

export class PackmindHttpClient {
  // undefined until asked; null once asked and unanswered.
  private editionFromAuthMe: PackmindEdition | null | undefined;

  constructor(private readonly apiKey: string) {}

  getAuthContext(): IAuthContext {
    if (!this.apiKey) {
      throw new NotLoggedInError();
    }

    let decoded: { host: string; jwt: string };
    try {
      const decodedString = Buffer.from(this.apiKey, 'base64').toString(
        'utf-8',
      );
      decoded = JSON.parse(decodedString);
    } catch {
      throw new Error('Invalid API key');
    }

    const jwtPayload = this.decodeJwt(decoded.jwt);
    const organizationId = jwtPayload?.organization?.id;

    if (!organizationId) {
      throw new Error('Invalid API key: missing organizationId');
    }

    const rawRole = jwtPayload?.organization?.role;
    const role: UserOrganizationRole | null =
      rawRole === 'admin' || rawRole === 'member' ? rawRole : null;

    return {
      host: decoded.host,
      jwt: decoded.jwt,
      organizationId,
      role,
    };
  }

  private decodeJwt(
    jwt: string,
  ): { organization?: { id?: string; role?: string } } | null {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payloadBase64 = parts[1];
      const payloadString = Buffer.from(payloadBase64, 'base64').toString(
        'utf-8',
      );
      return JSON.parse(payloadString);
    } catch {
      return null;
    }
  }

  async request<T>(path: string, options: IRequestOptions = {}): Promise<T> {
    const { host } = this.getAuthContext();
    const { method = 'GET', body } = options;

    const url = `${host}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': `packmind-cli:${version}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        // @ts-expect-error — Node.js fetch (undici) accepts a dispatcher option not present in the DOM types
        dispatcher,
      });

      if (!response.ok) {
        if (options.onError) {
          options.onError(response, await this.resolveEdition(response));
        }

        let errorMsg = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody?.message) {
            errorMsg = errorBody.message;
          }
        } catch {
          // ignore
        }
        const error: Error & { statusCode?: number } = new Error(errorMsg);
        error.statusCode = response.status;
        throw error;
      }

      return response.json();
    } catch (error: unknown) {
      // Re-throw errors thrown by onError callbacks without wrapping them
      if (isCommunityEditionError(error)) {
        throw error;
      }

      const err = error as {
        code?: string;
        name?: string;
        message?: string;
        cause?: { code?: string };
        statusCode?: number;
      };

      // Re-throw if already processed
      if (err.statusCode) throw error;

      const code = err?.code || err?.cause?.code;
      if (
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        err?.name === 'FetchError' ||
        (typeof err?.message === 'string' &&
          (err.message.includes('Failed to fetch') ||
            err.message.includes('network') ||
            err.message.includes('NetworkError')))
      ) {
        throw new Error(
          `Packmind server is not accessible at ${host}. Please check your network connection or the server URL.`,
        );
      }

      throw new Error(
        `Request failed: ${err?.message || JSON.stringify(error)}`,
      );
    }
  }

  /**
   * The edition behind a failed response, for callers whose route means
   * different things per edition.
   *
   * Falls back to /auth/me, which has carried `edition` since well before the
   * header and answers it even unauthenticated, so a server too old to set the
   * header can still be identified rather than guessed at. Asked once per
   * client, and only for a 404 — the one status whose meaning depends on the
   * edition, and the only reason to spend a request here.
   */
  private async resolveEdition(
    response: Response,
  ): Promise<PackmindEdition | null> {
    const fromHeader = readPackmindEdition(response);

    if (fromHeader !== null || response.status !== 404) {
      return fromHeader;
    }

    if (this.editionFromAuthMe === undefined) {
      this.editionFromAuthMe = await this.fetchEditionFromAuthMe();
    }

    return this.editionFromAuthMe;
  }

  private async fetchEditionFromAuthMe(): Promise<PackmindEdition | null> {
    try {
      const { host } = this.getAuthContext();
      const response = await fetch(`${host}/api/v0/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'User-Agent': `packmind-cli:${version}`,
        },
        // @ts-expect-error — Node.js fetch (undici) accepts a dispatcher option not present in the DOM types
        dispatcher,
      });

      // The edition rides both the authenticated body and the 401 one, so the
      // status is not worth checking.
      const body: unknown = await response.json();

      return parsePackmindEdition((body as { edition?: unknown })?.edition);
    } catch {
      return null;
    }
  }
}
