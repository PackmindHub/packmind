/**
 * Payload structure for API keys
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
 * Response when generating a new API key
 */
export interface GenerateApiKeyResponse {
  /**
   * The base64-encoded API key
   */
  apiKey: string;

  /**
   * Expiration date of the embedded JWT (3 months from generation)
   */
  expiresAt: Date;
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
