import {
  encodeApiKey,
  decodeApiKey,
  extractApiKeyFromHeader,
} from './api-key.utils';
import { ApiKeyPayload } from '../entities/ApiKey';

describe('API Key Utils', () => {
  describe('encodeApiKey', () => {
    const validPayload: ApiKeyPayload = {
      host: 'http://localhost:3000',
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    };

    it('returns a truthy value for valid payload', () => {
      const encoded = encodeApiKey(validPayload);

      expect(encoded).toBeTruthy();
    });

    it('returns a string for valid payload', () => {
      const encoded = encodeApiKey(validPayload);

      expect(typeof encoded).toBe('string');
    });

    it('produces valid base64 that decodes to original payload', () => {
      const encoded = encodeApiKey(validPayload);

      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const parsedPayload = JSON.parse(decoded);

      expect(parsedPayload).toEqual(validPayload);
    });

    describe('when payload has empty strings', () => {
      it('returns a truthy value', () => {
        const payload: ApiKeyPayload = {
          host: '',
          jwt: '',
        };

        const encoded = encodeApiKey(payload);

        expect(encoded).toBeTruthy();
      });
    });
  });

  describe('decodeApiKey', () => {
    const validPayload: ApiKeyPayload = {
      host: 'http://localhost:3000',
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    };

    describe('when API key is valid', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const encoded = encodeApiKey(validPayload);
        decoded = decodeApiKey(encoded);
      });

      it('returns isValid as true', () => {
        expect(decoded.isValid).toBe(true);
      });

      it('returns the original payload', () => {
        expect(decoded.payload).toEqual(validPayload);
      });

      it('returns undefined error', () => {
        expect(decoded.error).toBeUndefined();
      });
    });

    describe('when API key has whitespace', () => {
      const payloadWithWhitespace: ApiKeyPayload = {
        host: 'http://localhost:3000',
        jwt: 'test-jwt',
      };
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const encoded = encodeApiKey(payloadWithWhitespace);
        decoded = decodeApiKey(`  ${encoded}  \n`);
      });

      it('returns isValid as true', () => {
        expect(decoded.isValid).toBe(true);
      });

      it('returns the original payload', () => {
        expect(decoded.payload).toEqual(payloadWithWhitespace);
      });
    });

    describe('when base64 is malformed', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        decoded = decodeApiKey('not-valid-base64!@#');
      });

      it('returns isValid as false', () => {
        expect(decoded.isValid).toBe(false);
      });

      it('returns error containing decode failure message', () => {
        expect(decoded.error).toContain('Failed to decode API key');
      });
    });

    describe('when host field is missing', () => {
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

      it('returns error containing missing host message', () => {
        expect(decoded.error).toContain('missing or invalid host field');
      });
    });

    describe('when jwt field is missing', () => {
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

      it('returns error containing missing jwt message', () => {
        expect(decoded.error).toContain('missing or invalid jwt field');
      });
    });

    describe('when content is not JSON', () => {
      let decoded: ReturnType<typeof decodeApiKey>;

      beforeEach(() => {
        const encoded = Buffer.from('not json content').toString('base64');
        decoded = decodeApiKey(encoded);
      });

      it('returns isValid as false', () => {
        expect(decoded.isValid).toBe(false);
      });

      it('returns error containing decode failure message', () => {
        expect(decoded.error).toContain('Failed to decode API key');
      });
    });
  });

  describe('extractApiKeyFromHeader', () => {
    describe('when header has Bearer prefix', () => {
      it('extracts the API key', () => {
        const header = 'Bearer my-api-key-123';

        const extracted = extractApiKeyFromHeader(header);

        expect(extracted).toBe('my-api-key-123');
      });
    });

    describe('when header has no Bearer prefix', () => {
      it('returns the header as-is', () => {
        const header = 'my-api-key-123';

        const extracted = extractApiKeyFromHeader(header);

        expect(extracted).toBe('my-api-key-123');
      });
    });

    describe('when header has extra whitespace with Bearer prefix', () => {
      it('extracts the trimmed API key', () => {
        const header = 'Bearer   my-api-key-123  ';

        const extracted = extractApiKeyFromHeader(header);

        expect(extracted).toBe('my-api-key-123');
      });
    });

    describe('when header is undefined', () => {
      it('returns null', () => {
        const extracted = extractApiKeyFromHeader(undefined);

        expect(extracted).toBeNull();
      });
    });

    describe('when header is empty', () => {
      it('returns null', () => {
        const extracted = extractApiKeyFromHeader('');

        expect(extracted).toBeNull();
      });
    });

    describe('when header is just "Bearer" without key', () => {
      it('returns empty string', () => {
        const extracted = extractApiKeyFromHeader('Bearer');

        expect(extracted).toBe('');
      });
    });
  });
});
