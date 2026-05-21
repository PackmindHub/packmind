import {
  ICredentialsProvider,
  DecodedCredentials,
} from './ICredentialsProvider';
import { decodeApiKey } from './decodeApiKey';

export const ENV_VAR_NAMES = [
  'PACKMIND_API_KEY',
  'PACKMIND_API_KEY_V3',
] as const;

export class EnvCredentialsProvider implements ICredentialsProvider {
  getSourceName(): string {
    const name = this.findActiveEnvVarName() ?? ENV_VAR_NAMES[0];
    return `${name} environment variable`;
  }

  hasCredentials(): boolean {
    return this.findActiveEnvVarName() !== undefined;
  }

  loadCredentials(): DecodedCredentials | null {
    const name = this.findActiveEnvVarName();
    if (!name) {
      return null;
    }

    const apiKey = process.env[name];
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

  private findActiveEnvVarName(): string | undefined {
    for (const name of ENV_VAR_NAMES) {
      const value = process.env[name];
      if (value && value.trim().length > 0) {
        return name;
      }
    }
    return undefined;
  }
}
