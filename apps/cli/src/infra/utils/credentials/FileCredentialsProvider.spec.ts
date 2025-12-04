import * as fs from 'fs';
import {
  FileCredentialsProvider,
  getCredentialsPath,
  saveCredentials,
} from './FileCredentialsProvider';

// Mock fs module
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

function createTestApiKey(options: {
  host?: string;
  user?: { name: string; userId: string };
  organization?: { id: string; name: string; slug: string; role: string };
  exp?: number;
}): string {
  const jwtPayload = {
    user: options.user,
    organization: options.organization,
    exp: options.exp,
  };

  const jwtPayloadBase64 = Buffer.from(JSON.stringify(jwtPayload)).toString(
    'base64',
  );
  const jwt = `header.${jwtPayloadBase64}.signature`;

  const apiKeyPayload = {
    host: options.host ?? 'https://app.packmind.ai',
    jwt,
  };

  return Buffer.from(JSON.stringify(apiKeyPayload)).toString('base64');
}

describe('FileCredentialsProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCredentialsPath', () => {
    it('returns path in home directory with .packmind/credentials.json', () => {
      const result = getCredentialsPath();

      expect(result).toContain('.packmind');
      expect(result).toContain('credentials.json');
    });
  });

  describe('getSourceName', () => {
    it('returns the credentials file path', () => {
      const provider = new FileCredentialsProvider();

      const sourceName = provider.getSourceName();

      expect(sourceName).toContain('.packmind');
      expect(sourceName).toContain('credentials.json');
    });
  });

  describe('hasCredentials', () => {
    describe('when credentials file does not exist', () => {
      it('returns false', () => {
        mockFs.existsSync.mockReturnValue(false);
        const provider = new FileCredentialsProvider();

        expect(provider.hasCredentials()).toBe(false);
      });
    });

    describe('when credentials file has no apiKey', () => {
      it('returns false', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
        const provider = new FileCredentialsProvider();

        expect(provider.hasCredentials()).toBe(false);
      });
    });

    describe('when credentials file contains invalid JSON', () => {
      it('returns false', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('invalid json');
        const provider = new FileCredentialsProvider();

        expect(provider.hasCredentials()).toBe(false);
      });
    });

    describe('when credentials file has apiKey', () => {
      it('returns true', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({ apiKey: createTestApiKey({}) }),
        );
        const provider = new FileCredentialsProvider();

        expect(provider.hasCredentials()).toBe(true);
      });
    });
  });

  describe('loadCredentials', () => {
    describe('when credentials file does not exist', () => {
      it('returns null', () => {
        mockFs.existsSync.mockReturnValue(false);
        const provider = new FileCredentialsProvider();

        expect(provider.loadCredentials()).toBeNull();
      });
    });

    describe('when credentials file has invalid JSON', () => {
      it('returns null', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('invalid json');
        const provider = new FileCredentialsProvider();

        expect(provider.loadCredentials()).toBeNull();
      });
    });

    describe('when credentials file has no apiKey', () => {
      it('returns null', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
        const provider = new FileCredentialsProvider();

        expect(provider.loadCredentials()).toBeNull();
      });
    });

    describe('when API key is invalid', () => {
      it('returns null', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
          JSON.stringify({ apiKey: 'invalid-api-key' }),
        );
        const provider = new FileCredentialsProvider();

        expect(provider.loadCredentials()).toBeNull();
      });
    });

    it('returns credentials with host from API key', () => {
      const apiKey = createTestApiKey({ host: 'https://custom.host.com' });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey }));
      const provider = new FileCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.host).toBe('https://custom.host.com');
    });

    it('returns credentials with user name from JWT', () => {
      const apiKey = createTestApiKey({
        user: { name: 'Jane Doe', userId: 'user-456' },
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey }));
      const provider = new FileCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.userName).toBe('Jane Doe');
    });

    it('returns credentials with organization name from JWT', () => {
      const apiKey = createTestApiKey({
        organization: {
          id: 'org-456',
          name: 'Another Org',
          slug: 'another-org',
          role: 'member',
        },
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey }));
      const provider = new FileCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.organizationName).toBe('Another Org');
    });

    it('returns credentials with expiration date from JWT', () => {
      const expTimestamp = Math.floor(Date.now() / 1000) + 7200;
      const apiKey = createTestApiKey({ exp: expTimestamp });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey }));
      const provider = new FileCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.expiresAt).toEqual(new Date(expTimestamp * 1000));
    });

    it('returns credentials with the original API key', () => {
      const apiKey = createTestApiKey({});
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ apiKey }));
      const provider = new FileCredentialsProvider();

      const credentials = provider.loadCredentials();

      expect(credentials?.apiKey).toBe(apiKey);
    });
  });

  describe('saveCredentials', () => {
    it('creates credentials directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockReturnValue(undefined);
      mockFs.writeFileSync.mockReturnValue(undefined);
      const apiKey = createTestApiKey({});

      saveCredentials(apiKey);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.packmind'),
        { recursive: true, mode: 0o700 },
      );
    });

    it('does not create directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockReturnValue(undefined);
      const apiKey = createTestApiKey({});

      saveCredentials(apiKey);

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('saves API key to credentials file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockReturnValue(undefined);
      const apiKey = createTestApiKey({});

      saveCredentials(apiKey);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('credentials.json'),
        expect.stringContaining(apiKey),
        { mode: 0o600 },
      );
    });

    it('writes file with restricted permissions', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockReturnValue(undefined);
      const apiKey = createTestApiKey({});

      saveCredentials(apiKey);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { mode: 0o600 },
      );
    });
  });
});
