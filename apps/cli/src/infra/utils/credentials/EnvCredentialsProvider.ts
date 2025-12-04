import {
  ICredentialsProvider,
  DecodedCredentials,
} from './ICredentialsProvider';
import { decodeApiKey } from './decodeApiKey';

const ENV_VAR_NAME = 'PACKMIND_API_KEY_V3';

export class EnvCredentialsProvider implements ICredentialsProvider {
  getSourceName(): string {
    return `${ENV_VAR_NAME} environment variable`;
  }

  hasCredentials(): boolean {
    const apiKey = process.env[ENV_VAR_NAME];
    return !!apiKey && apiKey.trim().length > 0;
  }

  loadCredentials(): DecodedCredentials | null {
    const apiKey = process.env[ENV_VAR_NAME];
    if (!apiKey) {
      return null;
    }

    const decoded = decodeApiKey(apiKey);
    if (!decoded) {
      return null;
    }

    const expiresAt = decoded.jwt.exp
      ? new Date(decoded.jwt.exp * 1000)
      : undefined;

    return {
      apiKey,
      host: decoded.host,
      organizationName: decoded.jwt.organization?.name,
      userName: decoded.jwt.user?.name,
      expiresAt,
    };
  }
}
