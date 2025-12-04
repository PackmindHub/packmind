import { CredentialsService } from './CredentialsService';
import {
  ICredentialsProvider,
  DecodedCredentials,
} from './ICredentialsProvider';

class MockCredentialsProvider implements ICredentialsProvider {
  constructor(
    private readonly sourceName: string,
    private readonly credentials: DecodedCredentials | null,
  ) {}

  getSourceName(): string {
    return this.sourceName;
  }

  hasCredentials(): boolean {
    return this.credentials !== null;
  }

  loadCredentials(): DecodedCredentials | null {
    return this.credentials;
  }
}

describe('CredentialsService', () => {
  describe('loadCredentials', () => {
    describe('when no providers have credentials', () => {
      it('returns null', () => {
        const provider1 = new MockCredentialsProvider('Provider 1', null);
        const provider2 = new MockCredentialsProvider('Provider 2', null);
        const service = new CredentialsService([provider1, provider2]);

        const result = service.loadCredentials();

        expect(result).toBeNull();
      });
    });

    it('returns credentials from first provider that has them', () => {
      const credentials1: DecodedCredentials = {
        apiKey: 'api-key-1',
        host: 'https://host1.com',
        userName: 'User 1',
      };
      const credentials2: DecodedCredentials = {
        apiKey: 'api-key-2',
        host: 'https://host2.com',
        userName: 'User 2',
      };
      const provider1 = new MockCredentialsProvider('Provider 1', credentials1);
      const provider2 = new MockCredentialsProvider('Provider 2', credentials2);
      const service = new CredentialsService([provider1, provider2]);

      const result = service.loadCredentials();

      expect(result?.apiKey).toBe('api-key-1');
      expect(result?.host).toBe('https://host1.com');
    });

    describe('when first provider has no credentials', () => {
      it('falls back to second provider', () => {
        const credentials2: DecodedCredentials = {
          apiKey: 'api-key-2',
          host: 'https://host2.com',
          userName: 'User 2',
        };
        const provider1 = new MockCredentialsProvider('Provider 1', null);
        const provider2 = new MockCredentialsProvider(
          'Provider 2',
          credentials2,
        );
        const service = new CredentialsService([provider1, provider2]);

        const result = service.loadCredentials();

        expect(result?.apiKey).toBe('api-key-2');
        expect(result?.host).toBe('https://host2.com');
      });
    });

    it('includes source name from the provider', () => {
      const credentials: DecodedCredentials = {
        apiKey: 'api-key',
        host: 'https://host.com',
      };
      const provider = new MockCredentialsProvider(
        'My Custom Source',
        credentials,
      );
      const service = new CredentialsService([provider]);

      const result = service.loadCredentials();

      expect(result?.source).toBe('My Custom Source');
    });

    describe('when expiresAt is in the past', () => {
      it('sets isExpired to true', () => {
        const pastDate = new Date(Date.now() - 1000);
        const credentials: DecodedCredentials = {
          apiKey: 'api-key',
          host: 'https://host.com',
          expiresAt: pastDate,
        };
        const provider = new MockCredentialsProvider('Provider', credentials);
        const service = new CredentialsService([provider]);

        const result = service.loadCredentials();

        expect(result?.isExpired).toBe(true);
      });
    });

    describe('when expiresAt is in the future', () => {
      it('sets isExpired to false', () => {
        const futureDate = new Date(Date.now() + 3600000);
        const credentials: DecodedCredentials = {
          apiKey: 'api-key',
          host: 'https://host.com',
          expiresAt: futureDate,
        };
        const provider = new MockCredentialsProvider('Provider', credentials);
        const service = new CredentialsService([provider]);

        const result = service.loadCredentials();

        expect(result?.isExpired).toBe(false);
      });
    });

    describe('when expiresAt is undefined', () => {
      it('sets isExpired to false', () => {
        const credentials: DecodedCredentials = {
          apiKey: 'api-key',
          host: 'https://host.com',
        };
        const provider = new MockCredentialsProvider('Provider', credentials);
        const service = new CredentialsService([provider]);

        const result = service.loadCredentials();

        expect(result?.isExpired).toBe(false);
      });
    });
  });

  describe('loadApiKey', () => {
    describe('when no providers have credentials', () => {
      it('returns empty string', () => {
        const provider = new MockCredentialsProvider('Provider', null);
        const service = new CredentialsService([provider]);

        const result = service.loadApiKey();

        expect(result).toBe('');
      });
    });

    it('returns API key from credentials', () => {
      const credentials: DecodedCredentials = {
        apiKey: 'my-api-key',
        host: 'https://host.com',
      };
      const provider = new MockCredentialsProvider('Provider', credentials);
      const service = new CredentialsService([provider]);

      const result = service.loadApiKey();

      expect(result).toBe('my-api-key');
    });
  });

  describe('hasCredentials', () => {
    describe('when no providers have credentials', () => {
      it('returns false', () => {
        const provider1 = new MockCredentialsProvider('Provider 1', null);
        const provider2 = new MockCredentialsProvider('Provider 2', null);
        const service = new CredentialsService([provider1, provider2]);

        const result = service.hasCredentials();

        expect(result).toBe(false);
      });
    });

    describe('when at least one provider has credentials', () => {
      it('returns true', () => {
        const credentials: DecodedCredentials = {
          apiKey: 'api-key',
          host: 'https://host.com',
        };
        const provider1 = new MockCredentialsProvider('Provider 1', null);
        const provider2 = new MockCredentialsProvider(
          'Provider 2',
          credentials,
        );
        const service = new CredentialsService([provider1, provider2]);

        const result = service.hasCredentials();

        expect(result).toBe(true);
      });
    });
  });

  describe('default providers', () => {
    describe('when none provided', () => {
      it('creates service with default providers', () => {
        const service = new CredentialsService();

        // Service should be created without error
        expect(service).toBeInstanceOf(CredentialsService);
      });
    });
  });
});
