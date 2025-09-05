import {
  encodeApiKey,
  decodeApiKey,
  extractApiKeyFromHeader,
} from './api-key.utils';
import { ApiKeyPayload } from './ApiKeyPayload';

describe('API Key Utils', () => {
  describe('encodeApiKey', () => {
    it('encodes a valid payload to base64', () => {
      const payload: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
      };

      const encoded = encodeApiKey(payload);

      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe('string');

      // Verify it's valid base64
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsedPayload = JSON.parse(decoded);
      expect(parsedPayload).toEqual(payload);
    });

    it('handles empty strings in payload', () => {
      const payload: ApiKeyPayload = {
        host: '',
        jwt: '',
      };

      const encoded = encodeApiKey(payload);
      expect(encoded).toBeTruthy();
    });
  });

  describe('decodeApiKey', () => {
    it('decodes a valid base64 API key', () => {
      const payload: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
      };

      const encoded = encodeApiKey(payload);
      const decoded = decodeApiKey(encoded);

      expect(decoded.isValid).toBe(true);
      expect(decoded.payload).toEqual(payload);
      expect(decoded.error).toBeUndefined();
    });

    it('handles whitespace in API key', () => {
      const payload: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'test-jwt',
      };

      const encoded = encodeApiKey(payload);
      const decodedWithSpaces = decodeApiKey(`  ${encoded}  \n`);

      expect(decodedWithSpaces.isValid).toBe(true);
      expect(decodedWithSpaces.payload).toEqual(payload);
    });

    it('returns invalid for malformed base64', () => {
      const decoded = decodeApiKey('not-valid-base64!@#');

      expect(decoded.isValid).toBe(false);
      expect(decoded.error).toContain('Failed to decode API key');
    });

    it('returns invalid for missing host field', () => {
      const invalidPayload = { jwt: 'test-jwt' };
      const encoded = Buffer.from(JSON.stringify(invalidPayload)).toString(
        'base64',
      );

      const decoded = decodeApiKey(encoded);

      expect(decoded.isValid).toBe(false);
      expect(decoded.error).toContain('missing or invalid host field');
    });

    it('returns invalid for missing jwt field', () => {
      const invalidPayload = { host: 'http://localhost:3000' };
      const encoded = Buffer.from(JSON.stringify(invalidPayload)).toString(
        'base64',
      );

      const decoded = decodeApiKey(encoded);

      expect(decoded.isValid).toBe(false);
      expect(decoded.error).toContain('missing or invalid jwt field');
    });

    it('returns invalid for non-JSON content', () => {
      const encoded = Buffer.from('not json content').toString('base64');

      const decoded = decodeApiKey(encoded);

      expect(decoded.isValid).toBe(false);
      expect(decoded.error).toContain('Failed to decode API key');
    });
  });

  describe('extractApiKeyFromHeader', () => {
    it('extracts API key with Bearer prefix', () => {
      const header = 'Bearer my-api-key-123';
      const extracted = extractApiKeyFromHeader(header);

      expect(extracted).toBe('my-api-key-123');
    });

    it('extracts API key without Bearer prefix', () => {
      const header = 'my-api-key-123';
      const extracted = extractApiKeyFromHeader(header);

      expect(extracted).toBe('my-api-key-123');
    });

    it('handles extra whitespace with Bearer prefix', () => {
      const header = 'Bearer   my-api-key-123  ';
      const extracted = extractApiKeyFromHeader(header);

      expect(extracted).toBe('my-api-key-123');
    });

    it('returns null for undefined header', () => {
      const extracted = extractApiKeyFromHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('returns null for empty header', () => {
      const extracted = extractApiKeyFromHeader('');

      expect(extracted).toBeNull();
    });

    it('handles just "Bearer" without key', () => {
      const extracted = extractApiKeyFromHeader('Bearer');

      expect(extracted).toBe('');
    });
  });
});
