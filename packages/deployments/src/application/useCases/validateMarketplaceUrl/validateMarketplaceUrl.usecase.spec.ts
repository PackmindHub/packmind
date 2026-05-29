import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitProviderId,
  createOrganizationId,
  createUserId,
  GitProviderWithoutToken,
  IAccountsPort,
  IGitPort,
  MarketplaceDescriptor,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDescriptorParseError,
  MarketplaceUrlNotReachableError,
  Organization,
  OrganizationId,
  UnknownMarketplaceDescriptorError,
  User,
  UserId,
  ValidateMarketplaceUrlCommand,
} from '@packmind/types';
import { MarketplaceDescriptorParserRegistry } from '../../services/MarketplaceDescriptorParserRegistry';
import { ValidateMarketplaceUrlUseCase } from './validateMarketplaceUrl.usecase';

describe('ValidateMarketplaceUrlUseCase', () => {
  const organizationId: OrganizationId = createOrganizationId(uuidv4());
  const userId: UserId = createUserId(uuidv4());
  const providerId = createGitProviderId(uuidv4());

  const baseCommand: ValidateMarketplaceUrlCommand = {
    userId,
    organizationId,
    url: 'https://github.com/acme/plugins',
  };

  const adminUser = {
    id: userId,
    email: 'admin@example.com',
    displayName: 'Admin User',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'admin' as const }],
    trial: false,
  } as unknown as User;

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const tokenlessProvider: GitProviderWithoutToken = {
    id: providerId,
    source: 'github',
    organizationId,
    url: 'https://github.com',
    hasToken: false,
  };

  const descriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'ACME Plugins',
    plugins: [
      { slug: 'p1', name: 'P1' },
      { slug: 'p2', name: 'P2' },
      { slug: 'p3', name: 'P3' },
    ],
    raw: {},
  };

  let mockGitPort: jest.Mocked<IGitPort>;
  let mockParserRegistry: jest.Mocked<MarketplaceDescriptorParserRegistry>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let useCase: ValidateMarketplaceUrlUseCase;

  beforeEach(() => {
    mockGitPort = {
      listProviders: jest
        .fn()
        .mockResolvedValue({ providers: [tokenlessProvider] }),
      getFileFromRepo: jest.fn().mockResolvedValue({
        sha: 'sha',
        content: JSON.stringify({ vendor: 'anthropic', plugins: [] }),
      }),
    } as unknown as jest.Mocked<IGitPort>;

    mockParserRegistry = {
      parse: jest.fn().mockReturnValue(descriptor),
    } as unknown as jest.Mocked<MarketplaceDescriptorParserRegistry>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new ValidateMarketplaceUrlUseCase(
      mockGitPort,
      mockParserRegistry,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verified happy path', () => {
    it('returns verified response with repoPath, branch, and plugin count', async () => {
      const result = await useCase.execute(baseCommand);

      expect(result).toEqual({
        kind: 'verified',
        repoPath: 'acme/plugins',
        defaultBranch: 'main',
        pluginCount: 3,
      });
    });

    it('parses tree/<branch> segments from the URL', async () => {
      const result = await useCase.execute({
        ...baseCommand,
        url: 'https://github.com/acme/plugins/tree/develop',
      });

      expect(result.defaultBranch).toBe('develop');
    });
  });

  describe('not-public — no tokenless provider matches the host', () => {
    it('throws MarketplaceUrlNotReachableError when no providers exist', async () => {
      mockGitPort.listProviders = jest
        .fn()
        .mockResolvedValue({ providers: [] });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceUrlNotReachableError,
      );
    });

    it('throws MarketplaceUrlNotReachableError when only token-bearing providers match', async () => {
      mockGitPort.listProviders = jest.fn().mockResolvedValue({
        providers: [{ ...tokenlessProvider, hasToken: true }],
      });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceUrlNotReachableError,
      );
    });

    it('throws MarketplaceUrlNotReachableError on a host mismatch', async () => {
      await expect(
        useCase.execute({
          ...baseCommand,
          url: 'https://gitlab.com/acme/plugins',
        }),
      ).rejects.toBeInstanceOf(MarketplaceUrlNotReachableError);
    });
  });

  describe('malformed URL', () => {
    it('throws MarketplaceUrlNotReachableError on an unparseable URL', async () => {
      await expect(
        useCase.execute({
          ...baseCommand,
          url: 'not a url',
        }),
      ).rejects.toBeInstanceOf(MarketplaceUrlNotReachableError);
    });

    it('throws MarketplaceUrlNotReachableError when the URL has no repo segment', async () => {
      await expect(
        useCase.execute({
          ...baseCommand,
          url: 'https://github.com/acme',
        }),
      ).rejects.toBeInstanceOf(MarketplaceUrlNotReachableError);
    });
  });

  describe('descriptor not-found', () => {
    it('throws MarketplaceDescriptorNotFoundError when marketplace.json is missing', async () => {
      mockGitPort.getFileFromRepo = jest.fn().mockResolvedValue(null);

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceDescriptorNotFoundError,
      );
    });
  });

  describe('unreachable fetch', () => {
    it('wraps low-level fetch errors as MarketplaceUrlNotReachableError', async () => {
      mockGitPort.getFileFromRepo = jest
        .fn()
        .mockRejectedValue(new Error('network down'));

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceUrlNotReachableError,
      );
    });
  });

  describe('descriptor parse errors', () => {
    it('propagates UnknownMarketplaceDescriptorError', async () => {
      mockParserRegistry.parse.mockImplementation(() => {
        throw new UnknownMarketplaceDescriptorError();
      });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        UnknownMarketplaceDescriptorError,
      );
    });

    it('propagates MarketplaceDescriptorParseError', async () => {
      mockParserRegistry.parse.mockImplementation(() => {
        throw new MarketplaceDescriptorParseError('bad', new Error('boom'));
      });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceDescriptorParseError,
      );
    });
  });
});
