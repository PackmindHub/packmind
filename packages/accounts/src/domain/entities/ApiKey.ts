/**
 * Domain entity representing an API key payload
 * This is the data that gets encoded into the API key
 */
export interface ApiKeyPayload {
  /**
   * The host URL for the API
   */
  host: string;

  /**
   * JWT token with 3-month validity that authenticates the user
   */
  jwt: string;
}

/**
 * Decoded API key with validation info
 */
export interface DecodedApiKey {
  /**
   * The decoded payload
   */
  payload: ApiKeyPayload;

  /**
   * Whether the API key is valid
   */
  isValid: boolean;

  /**
   * Error message if validation failed
   */
  error?: string;
}
