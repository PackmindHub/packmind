import { ApiKeyPayload, DecodedApiKey } from '../entities/ApiKey';

/**
 * Encodes an API key payload to a base64 string
 * @param payload The API key payload to encode
 * @returns Base64-encoded API key string
 */
export function encodeApiKey(payload: ApiKeyPayload): string {
  try {
    const jsonString = JSON.stringify(payload);
    // Using Buffer for Node.js environment
    return Buffer.from(jsonString).toString('base64');
  } catch (error) {
    throw new Error(`Failed to encode API key: ${error}`);
  }
}

/**
 * Decodes a base64 API key string to its payload
 * @param apiKey The base64-encoded API key
 * @returns Decoded API key with validation status
 */
export function decodeApiKey(apiKey: string): DecodedApiKey {
  try {
    // Remove any whitespace
    const trimmedKey = apiKey.trim();

    // Decode from base64
    const jsonString = Buffer.from(trimmedKey, 'base64').toString('utf-8');

    // Parse JSON
    const payload = JSON.parse(jsonString) as ApiKeyPayload;

    // Validate required fields
    if (!payload.host || typeof payload.host !== 'string') {
      return {
        payload: payload,
        isValid: false,
        error: 'Invalid API key: missing or invalid host field',
      };
    }

    if (!payload.jwt || typeof payload.jwt !== 'string') {
      return {
        payload: payload,
        isValid: false,
        error: 'Invalid API key: missing or invalid jwt field',
      };
    }

    return {
      payload,
      isValid: true,
    };
  } catch (error) {
    return {
      payload: { host: '', jwt: '' },
      isValid: false,
      error: `Failed to decode API key: ${error}`,
    };
  }
}
