import { ApiKeyPayload, DecodedApiKey } from '../entities/ApiKey';
import { ApiKeyEncodingFailedError } from '../errors/ApiKeyEncodingFailedError';

export function encodeApiKey(payload: ApiKeyPayload): string {
  try {
    const jsonString = JSON.stringify(payload);
    return Buffer.from(jsonString).toString('base64');
  } catch (error) {
    throw new ApiKeyEncodingFailedError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function decodeApiKey(apiKey: string): DecodedApiKey {
  try {
    const trimmedKey = apiKey.trim();
    const jsonString = Buffer.from(trimmedKey, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonString) as ApiKeyPayload;

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
