import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { GitRepoService } from '@packmind/git';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createUserId,
  DistributionStatus,
  GitProviderTokenInvalidError,
  GitProviderWithoutToken,
  GitRepo,
  IAccountsPort,
  IGitPort,
  ISpacesPort,
  MarketplaceDescriptor,
  MarketplaceDescriptorBadFormatError,
  MarketplaceDescriptorNotFoundError,
  MarketplaceNotFoundError,
  MarketplacePluginNameConflictError,
  Organization,
  Package,
  PluginPublishAttemptedEvent,
  PublishPackageOnMarketplaceCommand,
  Space,
  SpaceType,
  User,
  UserId,
} from '@packmind/types';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { IMarketplaceDistributionRepository } from '../../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../../domain/repositories/IMarketplaceRepository';
import { PublishPluginToMarketplaceDelayedJob } from '../../jobs/PublishPluginToMarketplaceDelayedJob';
import { MarketplaceDescriptorParserRegistry } from '../../services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../../services/PackageService';
import { marketplaceFactory } from '../../../infra/repositories/__factories__/marketplaceFactory';
import { PublishPackageOnMarketplaceUseCase } from './PublishPackageOnMarketplaceUseCase';

describe('PublishPackageOnMarketplaceUseCase', () => {
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  const organization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const memberUser = {
    id: userId,
    email: 'member@example.com',
    displayName: 'Member',
    passwordHash: null,
    active: true,
    memberships: [{ userId, organizationId, role: 'member' as const }],
    trial: false,
  } as unknown as User;

  const baseCommand: PublishPackageOnMarketplaceCommand = {
    userId,
    organizationId,
    marketplaceId,
    packageId,
  };

  const pkg: Package = {
    id: packageId,
    name: 'Security Package',
    slug: 'security',
    description: 'Security curated package',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
    skills: [],
  };

  const space: Space = {
    id: spaceId,
    name: 'Default',
    slug: 'default',
    type: SpaceType.open,
    organizationId,
    isDefaultSpace: true,
    color: 'blue' as Space['color'],
  };

  const marketplace = marketplaceFactory({
    id: marketplaceId,
    organizationId,
    gitRepoId,
    name: 'ACME Marketplace',
    descriptor: {
      vendor: 'anthropic',
      name: 'ACME Marketplace',
      plugins: [],
      raw: { name: 'ACME Marketplace', plugins: [] },
    },
    pluginCount: 0,
  });

  const gitRepo: GitRepo = {
    id: gitRepoId,
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    providerId: gitProviderId,
    type: 'marketplace',
  };

  const providerWithToken: GitProviderWithoutToken = {
    id: gitProviderId,
    source: 'github',
    organizationId,
    url: 'https://github.com',
    hasAuth: true,
    authMethod: 'token',
  };

  const providerWithoutToken: GitProviderWithoutToken = {
    ...providerWithToken,
    hasAuth: false,
  };

  const parsedDescriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'ACME Marketplace',
    plugins: [],
    raw: { name: 'ACME Marketplace', plugins: [] },
  };

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockParserRegistry: jest.Mocked<MarketplaceDescriptorParserRegistry>;
  let mockEventEmitter: jest.Mocked<PackmindEventEmitterService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockPublishJob: jest.Mocked<PublishPluginToMarketplaceDelayedJob>;
  let useCase: PublishPackageOnMarketplaceUseCase;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findByOrganizationAndId: jest.fn().mockResolvedValue(marketplace),
      updateState: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockMarketplaceDistributionRepository = {
      findLatestByPackageAndMarketplace: jest.fn().mockResolvedValue(null),
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockPackageService = {
      findById: jest.fn().mockResolvedValue(pkg),
    } as unknown as jest.Mocked<PackageService>;

    mockSpacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(space),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockGitPort = {
      listProviders: jest
        .fn()
        .mockResolvedValue({ providers: [providerWithToken] }),
      getFileFromRepo: jest
        .fn()
        .mockResolvedValue({ sha: 'sha-1', content: '{}' }),
    } as unknown as jest.Mocked<IGitPort>;

    mockGitRepoService = {
      findMarketplaceGitRepoById: jest.fn().mockResolvedValue(gitRepo),
    } as unknown as jest.Mocked<GitRepoService>;

    mockParserRegistry = {
      parse: jest.fn().mockReturnValue(parsedDescriptor),
    } as unknown as jest.Mocked<MarketplaceDescriptorParserRegistry>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(memberUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockPublishJob = {
      addJob: jest.fn().mockResolvedValue('bullmq-job-1'),
    } as unknown as jest.Mocked<PublishPluginToMarketplaceDelayedJob>;

    useCase = new PublishPackageOnMarketplaceUseCase(
      mockMarketplaceRepository,
      mockMarketplaceDistributionRepository,
      mockPackageService,
      mockSpacesPort,
      mockGitPort,
      mockGitRepoService,
      mockParserRegistry,
      mockEventEmitter,
      mockPublishJob,
      mockAccountsPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      result = await useCase.execute(baseCommand);
    });

    it('persists an in-progress marketplace distribution row', () => {
      expect(mockMarketplaceDistributionRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DistributionStatus.in_progress,
          marketplaceId,
          packageId,
          pluginSlug: 'security',
          source: 'app',
        }),
      );
    });

    it('enqueues the publish-plugin-to-marketplace job', () => {
      expect(mockPublishJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          marketplaceId,
          packageId,
          organizationId,
          userId,
        }),
      );
    });

    describe('event emission', () => {
      let emitted: PluginPublishAttemptedEvent;

      beforeEach(() => {
        emitted = mockEventEmitter.emit.mock
          .calls[0][0] as PluginPublishAttemptedEvent;
      });

      it('emits a PluginPublishAttemptedEvent', () => {
        expect(emitted).toBeInstanceOf(PluginPublishAttemptedEvent);
      });

      it('flags the event with isFirstPublishForPackage=true', () => {
        expect(emitted.payload.isFirstPublishForPackage).toBe(true);
      });
    });

    describe('returned response', () => {
      it('returns the in-progress response with the marketplace context', () => {
        expect(result).toMatchObject({
          status: 'in_progress',
          marketplaceId,
          packageId,
          pluginSlug: 'security',
        });
      });

      it('returns a defined marketplace distribution id', () => {
        expect(result.marketplaceDistributionId).toBeDefined();
      });
    });
  });

  describe('when a previous distribution exists', () => {
    beforeEach(async () => {
      mockMarketplaceDistributionRepository.findLatestByPackageAndMarketplace.mockResolvedValue(
        {
          id: createMarketplaceId(uuidv4()) as unknown as never,
        } as unknown as never,
      );
      await useCase.execute(baseCommand);
    });

    it('emits attempted event with isFirstPublishForPackage=false', () => {
      const emitted = mockEventEmitter.emit.mock
        .calls[0][0] as PluginPublishAttemptedEvent;
      expect(emitted.payload.isFirstPublishForPackage).toBe(false);
    });
  });

  describe('when the marketplace does not belong to the organization', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findByOrganizationAndId.mockResolvedValue(null);
    });

    it('throws MarketplaceNotFoundError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceNotFoundError,
      );
    });

    it('does not enqueue any job', async () => {
      try {
        await useCase.execute(baseCommand);
      } catch {
        // expected
      }
      expect(mockPublishJob.addJob).not.toHaveBeenCalled();
    });
  });

  describe('when the package is unknown', () => {
    beforeEach(() => {
      mockPackageService.findById.mockResolvedValue(null);
    });

    it('throws PackageNotFoundError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        PackageNotFoundError,
      );
    });
  });

  describe('when the package belongs to a different organization', () => {
    beforeEach(() => {
      mockSpacesPort.getSpaceById.mockResolvedValue({
        ...space,
        organizationId: createOrganizationId(uuidv4()),
      } as Space);
    });

    it('throws PackageNotFoundError to avoid leaking cross-org existence', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        PackageNotFoundError,
      );
    });
  });

  describe('when the git provider has no token', () => {
    beforeEach(() => {
      mockGitPort.listProviders.mockResolvedValue({
        providers: [providerWithoutToken],
      });
    });

    it('throws GitProviderTokenInvalidError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        GitProviderTokenInvalidError,
      );
    });

    it('exposes the verbatim user-facing message on the error', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toMatchObject({
        message: GitProviderTokenInvalidError.USER_FACING_MESSAGE,
      });
    });

    it('does not enqueue the job', async () => {
      try {
        await useCase.execute(baseCommand);
      } catch {
        // expected
      }
      expect(mockPublishJob.addJob).not.toHaveBeenCalled();
    });
  });

  describe('when the marketplace descriptor file is missing', () => {
    beforeEach(() => {
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
    });

    it('throws MarketplaceDescriptorNotFoundError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceDescriptorNotFoundError,
      );
    });

    it('transitions the marketplace state to bad_format', async () => {
      try {
        await useCase.execute(baseCommand);
      } catch {
        // expected
      }
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
        marketplaceId,
        expect.objectContaining({ state: 'bad_format' }),
      );
    });
  });

  describe('when the marketplace descriptor is unparseable', () => {
    beforeEach(() => {
      mockParserRegistry.parse.mockImplementation(() => {
        throw new Error('invalid JSON');
      });
    });

    it('throws MarketplaceDescriptorBadFormatError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplaceDescriptorBadFormatError,
      );
    });

    it('transitions the marketplace state to bad_format', async () => {
      try {
        await useCase.execute(baseCommand);
      } catch {
        // expected
      }
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
        marketplaceId,
        expect.objectContaining({ state: 'bad_format' }),
      );
    });
  });

  describe('when an unmanaged plugin already uses the same slug', () => {
    beforeEach(() => {
      mockParserRegistry.parse.mockReturnValue({
        ...parsedDescriptor,
        plugins: [{ slug: 'security', name: 'Security (unmanaged)' }],
      });
    });

    it('throws MarketplacePluginNameConflictError', async () => {
      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        MarketplacePluginNameConflictError,
      );
    });

    it('does not enqueue the job', async () => {
      try {
        await useCase.execute(baseCommand);
      } catch {
        // expected
      }
      expect(mockPublishJob.addJob).not.toHaveBeenCalled();
    });
  });

  describe('when the plugin slug already exists but is managed by Packmind', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      mockParserRegistry.parse.mockReturnValue({
        ...parsedDescriptor,
        plugins: [{ slug: 'security', name: 'Security' }],
        packmindLock: {
          schemaVersion: 1,
          plugins: {
            security: {
              version: '0.1.0',
              contentHash: 'h',
              lastPublishedAt: '2026-06-01T00:00:00.000Z',
              lastPublishedBy: userId as UserId,
            },
          },
        },
      });
      result = await useCase.execute(baseCommand);
    });

    it('proceeds with the publish (republish path)', () => {
      expect(result.status).toBe('in_progress');
    });
  });
});
