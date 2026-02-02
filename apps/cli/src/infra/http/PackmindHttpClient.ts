import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

interface IAuthContext {
  host: string;
  jwt: string;
  organizationId: string;
}

interface IRequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  onError?: (response: Response) => void;
}

export class PackmindHttpClient {
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

    return {
      host: decoded.host,
      jwt: decoded.jwt,
      organizationId,
    };
  }

  private decodeJwt(jwt: string): { organization?: { id?: string } } | null {
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
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        if (options.onError) {
          options.onError(response);
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
}
