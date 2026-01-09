import {
  encodeApiKey,
  decodeApiKey,
  extractApiKeyFromHeader,
} from './api-key.utils';
import { ApiKeyPayload } from './ApiKeyPayload';

describe('API Key Utils', () => {
  describe('encodeApiKey', () => {
    describe('with valid payload', () => {
      const payload: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
      };
      let encoded: string;

      beforeEach(() => {
        encoded = encodeApiKey(payload);
      });

      it('produces valid base64 that decodes to original payload', () => {
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const parsedPayload = JSON.parse(decoded);

        expect(parsedPayload).toEqual(payload);
      });
    });

    it('handles empty strings in payload', () => {
      const payload: ApiKeyPayload = {
        host: '',
        jwt: '',
      };

      const encoded = encodeApiKey(payload);
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsedPayload = JSON.parse(decoded);

      expect(parsedPayload).toEqual(payload);
    });
  });

  describe('decodeApiKey', () => {
    describe('with valid base64 API key', () => {
      const payload: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
      };
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const encoded = encodeApiKey(payload);
        decoded = decodeApiKey(encoded);
      });

      it('returns isValid as true', () => {
        expect(decoded.isValid).toBe(true);
      });

      it('returns the original payload', () => {
        expect(decoded.payload).toEqual(payload);
      });

      it('returns undefined error', () => {
        expect(decoded.error).toBeUndefined();
      });
    });

    describe('with whitespace in API key', () => {
      const payload: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'test-jwt',
      };
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const encoded = encodeApiKey(payload);
        decoded = decodeApiKey(`  ${encoded}  \n`);
      });

      it('returns isValid as true', () => {
        expect(decoded.isValid).toBe(true);
      });

      it('returns the original payload', () => {
        expect(decoded.payload).toEqual(payload);
      });
    });

    describe('with malformed base64', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        decoded = decodeApiKey('not-valid-base64!@#');
      });

      it('returns isValid as false', () => {
        expect(decoded.isValid).toBe(false);
      });

      it('returns error containing failure message', () => {
        expect(decoded.error).toContain('Failed to decode API key');
      });
    });

    describe('with missing host field', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const invalidPayload = { jwt: 'test-jwt' };
        const encoded = Buffer.from(JSON.stringify(invalidPayload)).toString(
          'base64',
        );
        decoded = decodeApiKey(encoded);
      });

      it('returns isValid as false', () => {
        expect(decoded.isValid).toBe(false);
      });

      it('returns error about missing host field', () => {
        expect(decoded.error).toContain('missing or invalid host field');
      });
    });

    describe('with missing jwt field', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const invalidPayload = { host: 'http://localhost:3000' };
        const encoded = Buffer.from(JSON.stringify(invalidPayload)).toString(
          'base64',
        );
        decoded = decodeApiKey(encoded);
      });

      it('returns isValid as false', () => {
        expect(decoded.isValid).toBe(false);
      });

      it('returns error about missing jwt field', () => {
        expect(decoded.error).toContain('missing or invalid jwt field');
      });
    });

    describe('with non-JSON content', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const encoded = Buffer.from('not json content').toString('base64');
        decoded = decodeApiKey(encoded);
      });

      it('returns isValid as false', () => {
        expect(decoded.isValid).toBe(false);
      });

      it('returns error containing failure message', () => {
        expect(decoded.error).toContain('Failed to decode API key');
      });
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
