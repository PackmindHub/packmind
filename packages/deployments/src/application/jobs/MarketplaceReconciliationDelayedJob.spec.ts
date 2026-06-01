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
    let result: MarketplaceReconciliationJobOutput;

    beforeEach(async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify(baseDescriptor.raw),
      });
      // Parser returns an equivalent descriptor (deep-equal modulo raw).
      mockParserRegistry.parse.mockReturnValue({
        ...baseDescriptor,
        raw: { reformatted: true },
      });

      result = await job.runJob('job-1', input, new AbortController());
    });

    it('persists state="healthy"', () => {
      expect(result.state).toBe('healthy');
    });

    it('updates state exactly once', () => {
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledTimes(1);
    });

    it('updates the state for the reconciled marketplace id', () => {
      const [calledId] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(calledId).toBe(marketplaceId);
    });

    it('patches the state to "healthy"', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.state).toBe('healthy');
    });

    it('patches a fresh lastValidatedAt', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.lastValidatedAt).toBeInstanceOf(Date);
    });

    it('does not patch the descriptor', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.descriptor).toBeUndefined();
    });

    it('does not patch the plugin count', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.pluginCount).toBeUndefined();
    });

    it('reads the descriptor file from the marketplace-typed GitRepo', () => {
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

    let result: MarketplaceReconciliationJobOutput;

    beforeEach(async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'def',
        content: JSON.stringify(driftedDescriptor.raw),
      });
      mockParserRegistry.parse.mockReturnValue(driftedDescriptor);

      result = await job.runJob('job-2', input, new AbortController());
    });

    it('persists state="drift"', () => {
      expect(result.state).toBe('drift');
    });

    it('updates state exactly once', () => {
      expect(mockMarketplaceRepository.updateState).toHaveBeenCalledTimes(1);
    });

    it('updates the state for the reconciled marketplace id', () => {
      const [calledId] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(calledId).toBe(marketplaceId);
    });

    it('patches the state to "drift"', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.state).toBe('drift');
    });

    it('patches the new descriptor', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.descriptor).toBe(driftedDescriptor);
    });

    it('patches the new plugin count', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.pluginCount).toBe(driftedDescriptor.plugins.length);
    });

    it('patches a fresh lastValidatedAt', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.lastValidatedAt).toBeInstanceOf(Date);
    });
  });

  describe('unreachable state', () => {
    describe('when getFileFromRepo throws', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockRejectedValue(
          new Error('upstream timeout'),
        );

        result = await job.runJob('job-3', input, new AbortController());
      });

      it('persists state="unreachable"', () => {
        expect(result.state).toBe('unreachable');
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          {
            state: 'unreachable',
            lastValidatedAt: expect.any(Date),
          },
        );
      });

      it('leaves the descriptor untouched', () => {
        const patch = mockMarketplaceRepository.updateState.mock.calls[0][1];
        expect(patch.descriptor).toBeUndefined();
      });

      it('leaves the plugin count untouched', () => {
        const patch = mockMarketplaceRepository.updateState.mock.calls[0][1];
        expect(patch.pluginCount).toBeUndefined();
      });
    });

    describe('when getFileFromRepo returns null', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);

        result = await job.runJob('job-4', input, new AbortController());
      });

      it('persists state="unreachable"', () => {
        expect(result.state).toBe('unreachable');
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          {
            state: 'unreachable',
            lastValidatedAt: expect.any(Date),
          },
        );
      });
    });

    describe('when the parser throws', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'abc',
          content: 'not really json',
        });
        mockParserRegistry.parse.mockImplementation(() => {
          throw new Error('parse error');
        });

        result = await job.runJob('job-5', input, new AbortController());
      });

      it('persists state="unreachable"', () => {
        expect(result.state).toBe('unreachable');
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          {
            state: 'unreachable',
            lastValidatedAt: expect.any(Date),
          },
        );
      });
    });

    describe('when the marketplace-typed GitRepo cannot be resolved', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitRepoService.findMarketplaceGitRepoById.mockResolvedValue(null);

        result = await job.runJob('job-6', input, new AbortController());
      });

      it('persists state="unreachable"', () => {
        expect(result.state).toBe('unreachable');
      });

      it('does not fetch the descriptor file', () => {
        expect(mockGitPort.getFileFromRepo).not.toHaveBeenCalled();
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          {
            state: 'unreachable',
            lastValidatedAt: expect.any(Date),
          },
        );
      });
    });
  });

  describe('soft-deleted marketplace', () => {
    let result: MarketplaceReconciliationJobOutput;

    beforeEach(async () => {
      mockMarketplaceRepository.findById.mockResolvedValue(null);

      result = await job.runJob('job-7', input, new AbortController());
    });

    it('returns state="unreachable"', () => {
      expect(result.state).toBe('unreachable');
    });

    it('does not resolve the marketplace-typed GitRepo', () => {
      expect(
        mockGitRepoService.findMarketplaceGitRepoById,
      ).not.toHaveBeenCalled();
    });

    it('does not fetch the descriptor', () => {
      expect(mockGitPort.getFileFromRepo).not.toHaveBeenCalled();
    });

    it('does not update state', () => {
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
