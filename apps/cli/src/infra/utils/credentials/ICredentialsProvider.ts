export interface DecodedCredentials {
  apiKey: string;
  host: string;
  organizationName?: string;
  userName?: string;
  expiresAt?: Date;
}

export interface ICredentialsProvider {
  /**
   * Returns the source name for display purposes (e.g., "PACKMIND_API_KEY_V3 environment variable")
   */
  getSourceName(): string;

  /**
   * Checks if credentials are available from this provider
   */
  hasCredentials(): boolean;

  /**
   * Loads and decodes credentials from this provider
   * Returns null if credentials are not available or invalid
   */
  loadCredentials(): DecodedCredentials | null;
}
