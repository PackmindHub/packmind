import {
  ICredentialsProvider,
  DecodedCredentials,
} from './ICredentialsProvider';
import { EnvCredentialsProvider } from './EnvCredentialsProvider';
import { FileCredentialsProvider } from './FileCredentialsProvider';

export interface CredentialsResult extends DecodedCredentials {
  source: string;
  isExpired: boolean;
}

/**
 * Service that manages credential providers with priority ordering.
 * Priority: Environment variable > Credentials file
 */
export class CredentialsService {
  private readonly providers: ICredentialsProvider[];

  constructor(providers?: ICredentialsProvider[]) {
    this.providers = providers ?? [
      new EnvCredentialsProvider(),
      new FileCredentialsProvider(),
    ];
  }

  /**
   * Loads credentials from the first available provider
   * Returns null if no valid credentials are found
   */
  loadCredentials(): CredentialsResult | null {
    for (const provider of this.providers) {
      if (provider.hasCredentials()) {
        const credentials = provider.loadCredentials();
        if (credentials) {
          const isExpired = credentials.expiresAt
            ? credentials.expiresAt < new Date()
            : false;

          return {
            ...credentials,
            source: provider.getSourceName(),
            isExpired,
          };
        }
      }
    }
    return null;
  }

  /**
   * Returns just the API key from the first available provider
   * Returns empty string if no valid credentials are found
   */
  loadApiKey(): string {
    const credentials = this.loadCredentials();
    return credentials?.apiKey ?? '';
  }

  /**
   * Checks if any provider has credentials available
   */
  hasCredentials(): boolean {
    return this.providers.some((provider) => provider.hasCredentials());
  }
}

// Default singleton instance for convenience
const defaultCredentialsService = new CredentialsService();

/**
 * Loads the API key from environment variable or credentials file.
 * Priority:
 * 1. PACKMIND_API_KEY_V3 environment variable
 * 2. ~/.packmind/credentials.json file
 *
 * @returns The API key or empty string if not found
 */
export function loadApiKey(): string {
  return defaultCredentialsService.loadApiKey();
}

/**
 * Checks if credentials are available (either from env or file)
 */
export function hasCredentials(): boolean {
  return defaultCredentialsService.hasCredentials();
}

/**
 * Loads full credentials with decoded information
 */
export function loadCredentials(): CredentialsResult | null {
  return defaultCredentialsService.loadCredentials();
}
