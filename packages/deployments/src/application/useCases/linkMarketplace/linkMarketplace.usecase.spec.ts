import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { GitRepoService } from '@packmind/git';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  GitProviderMissingTokenError,
  GitProviderNotFoundError,
  GitProviderOrganizationMismatchError,
  GitProviderWithoutToken,
  GitRepo,
  GitRepoAlreadyLinkedAsStandardError,
  IAccountsPort,
  IGitPort,
  LinkMarketplaceCommand,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceAlreadyLinkedError,
  MarketplaceDescriptor,
  MarketplaceDescriptorNotFoundError,
  MarketplaceDescriptorParseError,
  MarketplaceLinkedEvent,
  Organization,
  OrganizationId,
  UnknownMarketplaceDescriptorError,
  User,
  UserId,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { MarketplaceReconciliationDelayedJob } from '../../jobs/MarketplaceReconciliationDelayedJob';
import { MarketplaceDescriptorParserRegistry } from '../../services/MarketplaceDescriptorParserRegistry';
import { LinkMarketplaceUseCase } from './linkMarketplace.usecase';

describe('LinkMarketplaceUseCase', () => {
  const organizationId: OrganizationId = createOrganizationId(uuidv4());
  const userId: UserId = createUserId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  const baseCommand: LinkMarketplaceCommand = {
    userId,
    organizationId,
    gitProviderId,
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    name: 'ACME Plugins',
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

  const providerWithToken: GitProviderWithoutToken = {
    id: gitProviderId,
    source: 'github',
    organizationId,
    url: 'https://github.com',
    hasToken: true,
  };

  const providerWithoutToken: GitProviderWithoutToken = {
    ...providerWithToken,
    hasToken: false,
  };

  const descriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'ACME Plugins',
    version: '1.0.0',
    plugins: [
      { slug: 'p1', name: 'Plugin 1' },
      { slug: 'p2', name: 'Plugin 2' },
    ],
    raw: { vendor: 'anthropic', plugins: [] },
  };

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockParserRegistry: jest.Mocked<MarketplaceDescriptorParserRegistry>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockReconciliationJob: jest.Mocked<MarketplaceReconciliationDelayedJob>;
  let useCase: LinkMarketplaceUseCase;

  const createdGitRepo: GitRepo = {
    id: createGitRepoId(uuidv4()),
    owner: baseCommand.owner,
    repo: baseCommand.repo,
    branch: baseCommand.branch,
    providerId: gitProviderId,
    type: 'marketplace',
  };

  beforeEach(() => {
    mockMarketplaceRepository = {
      add: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByOrganizationAndGitRepo: jest.fn(),
      findByOrganizationAndId: jest.fn(),
      findAllForReconciliation: jest.fn(),
      updateState: jest.fn(),
      findById: jest.fn(),
      addMany: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      hardDeleteById: jest.fn(),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockGitRepoService = {
      findGitRepoIgnoringType: jest.fn().mockResolvedValue(null),
      addGitRepo: jest.fn().mockResolvedValue(createdGitRepo),
    } as unknown as jest.Mocked<GitRepoService>;

    mockGitPort = {
      listProviders: jest.fn().mockResolvedValue({
        providers: [providerWithToken],
      }),
      getFileFromRepo: jest.fn().mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify({ vendor: 'anthropic', plugins: [] }),
      }),
    } as unknown as jest.Mocked<IGitPort>;

    mockParserRegistry = {
      parse: jest.fn().mockReturnValue(descriptor),
    } as unknown as jest.Mocked<MarketplaceDescriptorParserRegistry>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(adminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockReconciliationJob = {
      scheduleRecurring: jest.fn().mockResolvedValue(undefined),
      cancelRecurring: jest.fn().mockResolvedValue(undefined),
      addJob: jest.fn().mockResolvedValue('job-id'),
    } as unknown as jest.Mocked<MarketplaceReconciliationDelayedJob>;

    mockMarketplaceRepository.add.mockImplementation(
      async (m) => m as Marketplace,
    );

    useCase = new LinkMarketplaceUseCase(
      mockMarketplaceRepository,
      mockGitRepoService,
      mockGitPort,
      mockParserRegistry,
      mockEventEmitterService,
      mockReconciliationJob,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('admin happy path — private (token-bearing) provider', () => {
    it('creates a marketplace row enriched with addedByUserName', async () => {
      const response = await useCase.execute(baseCommand);

      expect(mockMarketplaceRepository.add).toHaveBeenCalledTimes(1);
      const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
      expect(inserted.organizationId).toBe(organizationId);
      expect(inserted.gitRepoId).toBe(createdGitRepo.id);
      expect(inserted.name).toBe('ACME Plugins');
      expect(inserted.vendor).toBe('anthropic');
      expect(inserted.descriptor).toBe(descriptor);
      expect(inserted.pluginCount).toBe(descriptor.plugins.length);
      expect(response.addedByUserName).toBe(adminUser.displayName);
    });

    it('fetches marketplace.json from the requested repo', async () => {
      await useCase.execute(baseCommand);

      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledTimes(1);
      const [gitRepoArg, pathArg, branchArg] =
        mockGitPort.getFileFromRepo.mock.calls[0];
      expect(gitRepoArg.owner).toBe('acme');
      expect(gitRepoArg.repo).toBe('plugins');
      expect(gitRepoArg.type).toBe('marketplace');
      expect(pathArg).toBe(MARKETPLACE_DESCRIPTOR_FILENAME);
      expect(branchArg).toBe('main');
    });

    it('persists a marketplace-typed GitRepo via GitRepoService.addGitRepo', async () => {
      await useCase.execute(baseCommand);

      expect(mockGitRepoService.addGitRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'acme',
          repo: 'plugins',
          branch: 'main',
          providerId: gitProviderId,
          type: 'marketplace',
        }),
      );
    });

    it('emits MarketplaceLinkedEvent', async () => {
      await useCase.execute(baseCommand);

      expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
      const emitted = mockEventEmitterService.emit.mock.calls[0][0];
      expect(emitted).toBeInstanceOf(MarketplaceLinkedEvent);
      expect(emitted.payload.organizationId).toBe(organizationId);
      expect(emitted.payload.gitRepoId).toBe(createdGitRepo.id);
      expect(emitted.payload.addedBy).toBe(userId);
    });

    it('schedules the repeatable reconciliation cron and seeds an immediate run', async () => {
      await useCase.execute(baseCommand);

      const insertedId = mockMarketplaceRepository.add.mock.calls[0][0].id;
      expect(mockReconciliationJob.scheduleRecurring).toHaveBeenCalledWith(
        insertedId,
      );
      expect(mockReconciliationJob.addJob).toHaveBeenCalledWith({
        marketplaceId: insertedId,
      });
    });
  });

  describe('admin happy path — public (tokenless) provider', () => {
    beforeEach(() => {
      mockGitPort.listProviders = jest.fn().mockResolvedValue({
        providers: [providerWithoutToken],
      });
    });

    it('still rejects the private link path when the provider has no token', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        GitProviderMissingTokenError,
      );
    });
  });

  describe('non-admin denial', () => {
    beforeEach(() => {
      const memberUser = {
        ...adminUser,
        memberships: [{ userId, organizationId, role: 'member' as const }],
      } as unknown as User;
      mockAccountsPort.getUserById = jest.fn().mockResolvedValue(memberUser);
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toMatchObject({
        name: 'OrganizationAdminRequiredError',
      });
    });

    it('does not call any downstream service', async () => {
      try {
        await useCase.execute(baseCommand);
      } catch {
        // expected
      }
      expect(mockMarketplaceRepository.add).not.toHaveBeenCalled();
      expect(mockGitRepoService.addGitRepo).not.toHaveBeenCalled();
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('provider validation errors', () => {
    it('throws GitProviderNotFoundError when the provider is missing', async () => {
      mockGitPort.listProviders = jest
        .fn()
        .mockResolvedValue({ providers: [] });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        GitProviderNotFoundError,
      );
    });

    it('throws GitProviderOrganizationMismatchError on cross-org provider', async () => {
      const otherOrgProvider: GitProviderWithoutToken = {
        ...providerWithToken,
        organizationId: createOrganizationId(uuidv4()),
      };
      mockGitPort.listProviders = jest
        .fn()
        .mockResolvedValue({ providers: [otherOrgProvider] });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        GitProviderOrganizationMismatchError,
      );
    });
  });

  describe('cross-type collisions', () => {
    it('throws MarketplaceAlreadyLinkedError when a marketplace-typed repo exists', async () => {
      mockGitRepoService.findGitRepoIgnoringType.mockResolvedValue({
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'plugins',
        branch: 'main',
        providerId: gitProviderId,
        type: 'marketplace',
      } as GitRepo);

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceAlreadyLinkedError,
      );
    });

    it('throws GitRepoAlreadyLinkedAsStandardError when a standard-typed repo exists', async () => {
      mockGitRepoService.findGitRepoIgnoringType.mockResolvedValue({
        id: createGitRepoId(uuidv4()),
        owner: 'acme',
        repo: 'plugins',
        branch: 'main',
        providerId: gitProviderId,
        type: 'standard',
      } as GitRepo);

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        GitRepoAlreadyLinkedAsStandardError,
      );
    });
  });

  describe('descriptor errors', () => {
    it('throws MarketplaceDescriptorNotFoundError when marketplace.json is missing', async () => {
      mockGitPort.getFileFromRepo = jest.fn().mockResolvedValue(null);

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceDescriptorNotFoundError,
      );
    });

    it('propagates UnknownMarketplaceDescriptorError from the registry', async () => {
      mockParserRegistry.parse.mockImplementation(() => {
        throw new UnknownMarketplaceDescriptorError();
      });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        UnknownMarketplaceDescriptorError,
      );
    });

    it('propagates MarketplaceDescriptorParseError from the registry', async () => {
      mockParserRegistry.parse.mockImplementation(() => {
        throw new MarketplaceDescriptorParseError(
          'malformed',
          new Error('boom'),
        );
      });

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceDescriptorParseError,
      );
    });
  });
});
