import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { IQueue, QueueListeners } from '@packmind/node-utils';
import { GitRepoService } from '@packmind/git';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceId,
  createOrganizationId,
  createUserId,
  GitRepo,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceReconciliationJobInput,
  MarketplaceReconciliationJobOutput,
} from '@packmind/types';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { MarketplaceReconciliationDelayedJob } from './MarketplaceReconciliationDelayedJob';

describe('MarketplaceReconciliationDelayedJob', () => {
  const marketplaceId = createMarketplaceId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const providerId = createGitProviderId(uuidv4());

  const baseDescriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'ACME Plugins',
    version: '1.0.0',
    plugins: [
      { slug: 'p1', name: 'Plugin 1' },
      { slug: 'p2', name: 'Plugin 2' },
    ],
    raw: { vendor: 'anthropic', name: 'ACME Plugins', plugins: [] },
  };

  const marketplace = {
    id: marketplaceId,
    organizationId,
    gitRepoId,
    name: 'ACME Plugins',
    vendor: 'anthropic',
    addedBy: userId,
    linkedAt: new Date('2024-01-01T00:00:00Z'),
    state: 'healthy',
    lastValidatedAt: null,
    descriptor: baseDescriptor,
    pluginCount: baseDescriptor.plugins.length,
  } as unknown as Marketplace;

  const gitRepo: GitRepo = {
    id: gitRepoId,
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    providerId,
    type: 'marketplace',
  };

  const input: MarketplaceReconciliationJobInput = { marketplaceId };

  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockParserRegistry: jest.Mocked<MarketplaceDescriptorParserRegistry>;
  let mockQueue: jest.Mocked<
    IQueue<
      MarketplaceReconciliationJobInput,
      MarketplaceReconciliationJobOutput
    >
  >;
  let job: MarketplaceReconciliationDelayedJob;

  const queueFactory = async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _listeners: Partial<QueueListeners>,
  ) => mockQueue;

  beforeEach(() => {
    mockMarketplaceRepository = {
      findById: jest.fn().mockResolvedValue(marketplace),
      updateState: jest.fn().mockResolvedValue(undefined),
      findByOrganizationId: jest.fn(),
      findByOrganizationAndGitRepo: jest.fn(),
      findByOrganizationAndId: jest.fn(),
      findAllForReconciliation: jest.fn(),
      add: jest.fn(),
      addMany: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      hardDeleteById: jest.fn(),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockGitRepoService = {
      findMarketplaceGitRepoById: jest.fn().mockResolvedValue(gitRepo),
    } as unknown as jest.Mocked<GitRepoService>;

    mockGitPort = {
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockParserRegistry = {
      parse: jest.fn().mockReturnValue(baseDescriptor),
    } as unknown as jest.Mocked<MarketplaceDescriptorParserRegistry>;

    mockQueue = {
      addJob: jest.fn().mockResolvedValue('queued-job-id'),
      cancelJob: jest.fn().mockResolvedValue(undefined),
      removeRepeatable: jest.fn().mockResolvedValue(undefined),
      addWorker: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<
      IQueue<
        MarketplaceReconciliationJobInput,
        MarketplaceReconciliationJobOutput
      >
    >;

    job = new MarketplaceReconciliationDelayedJob(
      queueFactory,
      mockMarketplaceRepository,
      mockGitRepoService,
      mockGitPort,
      mockParserRegistry,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthy state — descriptor unchanged', () => {
    beforeEach(() => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify(baseDescriptor.raw),
      });
      // Parser returns an equivalent descriptor (deep-equal modulo raw).
      mockParserRegistry.parse.mockReturnValue({
        ...baseDescriptor,
        raw: { reformatted: true },
      });
    });

    it('persists state="healthy" with a fresh lastValidatedAt and no descriptor update', async () => {
      const result = await job.runJob('job-1', input, new AbortController());

      expect(result.state).toBe('healthy');
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledTimes(1);
      const [calledId, patch] =
        mockMarketplaceRepository.updateState.mock.calls[0];
      expect(calledId).toBe(marketplaceId);
      expect(patch.state).toBe('healthy');
      expect(patch.lastValidatedAt).toBeInstanceOf(Date);
      expect(patch.descriptor).toBeUndefined();
      expect(patch.pluginCount).toBeUndefined();
    });

    it('reads the descriptor file from the marketplace-typed GitRepo', async () => {
      await job.runJob('job-1', input, new AbortController());

      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        MARKETPLACE_DESCRIPTOR_FILENAME,
        gitRepo.branch,
      );
    });
  });

  describe('drift state — descriptor differs', () => {
    const driftedDescriptor: MarketplaceDescriptor = {
      vendor: 'anthropic',
      name: 'ACME Plugins',
      version: '2.0.0',
      plugins: [
        { slug: 'p1', name: 'Plugin 1' },
        { slug: 'p2', name: 'Plugin 2' },
        { slug: 'p3', name: 'Plugin 3' },
      ],
      raw: { version: '2.0.0' },
    };

    beforeEach(() => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'def',
        content: JSON.stringify(driftedDescriptor.raw),
      });
      mockParserRegistry.parse.mockReturnValue(driftedDescriptor);
    });

    it('persists state="drift" along with the new descriptor and plugin count', async () => {
      const result = await job.runJob('job-2', input, new AbortController());

      expect(result.state).toBe('drift');
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledTimes(1);
      const [calledId, patch] =
        mockMarketplaceRepository.updateState.mock.calls[0];
      expect(calledId).toBe(marketplaceId);
      expect(patch.state).toBe('drift');
      expect(patch.descriptor).toBe(driftedDescriptor);
      expect(patch.pluginCount).toBe(driftedDescriptor.plugins.length);
      expect(patch.lastValidatedAt).toBeInstanceOf(Date);
    });
  });

  describe('unreachable state', () => {
    it('persists state="unreachable" when getFileFromRepo throws', async () => {
      mockGitPort.getFileFromRepo.mockRejectedValue(
        new Error('upstream timeout'),
      );

      const result = await job.runJob('job-3', input, new AbortController());

      expect(result.state).toBe('unreachable');
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
        marketplaceId,
        {
          state: 'unreachable',
          lastValidatedAt: expect.any(Date),
        },
      );
      // Descriptor untouched.
      const patch = mockMarketplaceRepository.updateState.mock.calls[0][1];
      expect(patch.descriptor).toBeUndefined();
      expect(patch.pluginCount).toBeUndefined();
    });

    it('persists state="unreachable" when getFileFromRepo returns null', async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await job.runJob('job-4', input, new AbortController());

      expect(result.state).toBe('unreachable');
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
        marketplaceId,
        {
          state: 'unreachable',
          lastValidatedAt: expect.any(Date),
        },
      );
    });

    it('persists state="unreachable" when the parser throws', async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: 'not really json',
      });
      mockParserRegistry.parse.mockImplementation(() => {
        throw new Error('parse error');
      });

      const result = await job.runJob('job-5', input, new AbortController());

      expect(result.state).toBe('unreachable');
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
        marketplaceId,
        {
          state: 'unreachable',
          lastValidatedAt: expect.any(Date),
        },
      );
    });

    it('persists state="unreachable" when the marketplace-typed GitRepo cannot be resolved', async () => {
      mockGitRepoService.findMarketplaceGitRepoById.mockResolvedValue(null);

      const result = await job.runJob('job-6', input, new AbortController());

      expect(result.state).toBe('unreachable');
      expect(mockGitPort.getFileFromRepo).not.toHaveBeenCalled();
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
        marketplaceId,
        {
          state: 'unreachable',
          lastValidatedAt: expect.any(Date),
        },
      );
    });
  });

  describe('soft-deleted marketplace', () => {
    beforeEach(() => {
      mockMarketplaceRepository.findById.mockResolvedValue(null);
    });

    it('skips the job without updating state or fetching the descriptor', async () => {
      const result = await job.runJob('job-7', input, new AbortController());

      expect(result.state).toBe('unreachable');
      expect(
        mockGitRepoService.findMarketplaceGitRepoById,
      ).not.toHaveBeenCalled();
      expect(mockGitPort.getFileFromRepo).not.toHaveBeenCalled();
      expect(mockMarketplaceRepository.updateState).not.toHaveBeenCalled();
    });
  });

  describe('getJobName', () => {
    it('returns a stable name keyed by marketplaceId', () => {
      const name = job.getJobName({ marketplaceId });
      expect(name).toBe(`marketplace-reconciliation-${marketplaceId}`);
    });
  });
});
