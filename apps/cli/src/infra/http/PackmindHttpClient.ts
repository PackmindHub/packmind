import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';

interface IAuthContext {
  host: string;
  jwt: string;
  organizationId: string;
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
}
