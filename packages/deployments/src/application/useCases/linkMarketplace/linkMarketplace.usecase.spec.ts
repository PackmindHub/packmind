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
    describe('marketplace row enriched with addedByUserName', () => {
      let response: Awaited<ReturnType<LinkMarketplaceUseCase['execute']>>;

      beforeEach(async () => {
        response = await useCase.execute(baseCommand);
      });

      it('creates exactly one marketplace row', () => {
        expect(mockMarketplaceRepository.add).toHaveBeenCalledTimes(1);
      });

      it('sets the organizationId on the inserted row', () => {
        const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
        expect(inserted.organizationId).toBe(organizationId);
      });

      it('sets the gitRepoId on the inserted row', () => {
        const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
        expect(inserted.gitRepoId).toBe(createdGitRepo.id);
      });

      it('sets the name on the inserted row', () => {
        const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
        expect(inserted.name).toBe('ACME Plugins');
      });

      it('sets the vendor on the inserted row', () => {
        const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
        expect(inserted.vendor).toBe('anthropic');
      });

      it('sets the descriptor on the inserted row', () => {
        const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
        expect(inserted.descriptor).toBe(descriptor);
      });

      it('sets the pluginCount on the inserted row', () => {
        const inserted = mockMarketplaceRepository.add.mock.calls[0][0];
        expect(inserted.pluginCount).toBe(descriptor.plugins.length);
      });

      it('enriches the response with addedByUserName', () => {
        expect(response.addedByUserName).toBe(adminUser.displayName);
      });
    });

    describe('fetching marketplace.json from the requested repo', () => {
      beforeEach(async () => {
        await useCase.execute(baseCommand);
      });

      it('fetches the file exactly once', () => {
        expect(mockGitPort.getFileFromRepo).toHaveBeenCalledTimes(1);
      });

      it('targets the requested owner', () => {
        const [gitRepoArg] = mockGitPort.getFileFromRepo.mock.calls[0];
        expect(gitRepoArg.owner).toBe('acme');
      });

      it('targets the requested repo', () => {
        const [gitRepoArg] = mockGitPort.getFileFromRepo.mock.calls[0];
        expect(gitRepoArg.repo).toBe('plugins');
      });

      it('uses a marketplace-typed git repo', () => {
        const [gitRepoArg] = mockGitPort.getFileFromRepo.mock.calls[0];
        expect(gitRepoArg.type).toBe('marketplace');
      });

      it('reads the marketplace descriptor filename', () => {
        const [, pathArg] = mockGitPort.getFileFromRepo.mock.calls[0];
        expect(pathArg).toBe(MARKETPLACE_DESCRIPTOR_FILENAME);
      });

      it('reads from the requested branch', () => {
        const [, , branchArg] = mockGitPort.getFileFromRepo.mock.calls[0];
        expect(branchArg).toBe('main');
      });
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

    describe('emitting MarketplaceLinkedEvent', () => {
      beforeEach(async () => {
        await useCase.execute(baseCommand);
      });

      it('emits exactly one event', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
      });

      it('emits a MarketplaceLinkedEvent instance', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted).toBeInstanceOf(MarketplaceLinkedEvent);
      });

      it('sets the organizationId on the event payload', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted.payload.organizationId).toBe(organizationId);
      });

      it('sets the gitRepoId on the event payload', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted.payload.gitRepoId).toBe(createdGitRepo.id);
      });

      it('sets the addedBy on the event payload', () => {
        const emitted = mockEventEmitterService.emit.mock.calls[0][0];
        expect(emitted.payload.addedBy).toBe(userId);
      });
    });

    describe('scheduling reconciliation', () => {
      beforeEach(async () => {
        await useCase.execute(baseCommand);
      });

      it('schedules the repeatable reconciliation cron', () => {
        const insertedId = mockMarketplaceRepository.add.mock.calls[0][0].id;
        expect(mockReconciliationJob.scheduleRecurring).toHaveBeenCalledWith(
          insertedId,
        );
      });

      it('seeds an immediate reconciliation run', () => {
        const insertedId = mockMarketplaceRepository.add.mock.calls[0][0].id;
        expect(mockReconciliationJob.addJob).toHaveBeenCalledWith({
          marketplaceId: insertedId,
        });
      });
    });
  });

  describe('admin happy path — public (tokenless) provider', () => {
    beforeEach(() => {
      mockGitPort.listProviders = jest.fn().mockResolvedValue({
        providers: [providerWithoutToken],
      });
    });

    describe('when the provider has no token', () => {
      it('still rejects the private link path', async () => {
        await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
          GitProviderMissingTokenError,
        );
      });
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

    describe('does not call any downstream service', () => {
      beforeEach(async () => {
        try {
          await useCase.execute(baseCommand);
        } catch {
          // expected
        }
      });

      it('does not persist a marketplace row', () => {
        expect(mockMarketplaceRepository.add).not.toHaveBeenCalled();
      });

      it('does not persist a git repo', () => {
        expect(mockGitRepoService.addGitRepo).not.toHaveBeenCalled();
      });

      it('does not emit any event', () => {
        expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });

  describe('provider validation errors', () => {
    describe('when the provider is missing', () => {
      it('throws GitProviderNotFoundError', async () => {
        mockGitPort.listProviders = jest
          .fn()
          .mockResolvedValue({ providers: [] });

        await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
          GitProviderNotFoundError,
        );
      });
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
    describe('when a marketplace-typed repo exists', () => {
      it('throws MarketplaceAlreadyLinkedError', async () => {
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
    });

    describe('when a standard-typed repo exists', () => {
      it('throws GitRepoAlreadyLinkedAsStandardError', async () => {
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
  });

  describe('descriptor errors', () => {
    describe('when marketplace.json is missing', () => {
      it('throws MarketplaceDescriptorNotFoundError', async () => {
        mockGitPort.getFileFromRepo = jest.fn().mockResolvedValue(null);

        await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
          MarketplaceDescriptorNotFoundError,
        );
      });
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
