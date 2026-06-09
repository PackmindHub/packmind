import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { IQueue, QueueListeners } from '@packmind/node-utils';
import { GitRepoService } from '@packmind/git';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createUserId,
  DistributionStatus,
  GitRepo,
  IGitPort,
  MARKETPLACE_DESCRIPTOR_FILENAME,
  Marketplace,
  MarketplaceDescriptor,
  MarketplaceDistribution,
  MarketplaceReconciliationJobInput,
  MarketplaceReconciliationJobOutput,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
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
  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
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

    mockMarketplaceDistributionRepository = {
      findSuccessfulByMarketplaceId: jest.fn().mockResolvedValue([]),
      findPendingRemovalsByMarketplaceId: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockGitRepoService = {
      findMarketplaceGitRepoById: jest.fn().mockResolvedValue(gitRepo),
    } as unknown as jest.Mocked<GitRepoService>;

    mockGitPort = {
      getFileFromRepo: jest.fn(),
      checkMarketplaceRepoExists: jest.fn().mockResolvedValue({ exists: true }),
      findOpenSyncPullRequest: jest.fn().mockResolvedValue(null),
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
      mockMarketplaceDistributionRepository,
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
      // The job spreads the descriptor with optional driftedPluginSlugs,
      // so deep-equal rather than reference-equal.
      expect(patch.descriptor).toMatchObject({
        vendor: driftedDescriptor.vendor,
        name: driftedDescriptor.name,
        version: driftedDescriptor.version,
        plugins: driftedDescriptor.plugins,
      });
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

      it('classifies a plain fetch failure as network_transient', () => {
        expect(result.errorKind).toBe('network_transient');
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          expect.objectContaining({
            state: 'unreachable',
            lastValidatedAt: expect.any(Date),
            errorKind: 'network_transient',
          }),
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
          expect.objectContaining({
            state: 'unreachable',
            lastValidatedAt: expect.any(Date),
            errorKind: 'repo_not_found',
          }),
        );
      });
    });
  });

  describe('bad_format state', () => {
    describe('when getFileFromRepo returns null and the repo is reachable', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
        mockGitPort.checkMarketplaceRepoExists.mockResolvedValue({
          exists: true,
        });

        result = await job.runJob('job-bf-1', input, new AbortController());
      });

      it('persists state="bad_format"', () => {
        expect(result.state).toBe('bad_format');
      });

      it('leaves errorKind null for a broken-contract descriptor', () => {
        expect(result.errorKind).toBeNull();
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          expect.objectContaining({
            state: 'bad_format',
            lastValidatedAt: expect.any(Date),
            errorKind: null,
          }),
        );
      });
    });

    describe('when getFileFromRepo returns null and the repo is gone', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
        mockGitPort.checkMarketplaceRepoExists.mockResolvedValue({
          exists: false,
          reason: 'repo_not_found',
        });

        result = await job.runJob('job-bf-gone', input, new AbortController());
      });

      it('persists state="unreachable"', () => {
        expect(result.state).toBe('unreachable');
      });

      it('classifies the failure as repo_not_found', () => {
        expect(result.errorKind).toBe('repo_not_found');
      });

      it('updates the state with errorKind=repo_not_found', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          expect.objectContaining({
            state: 'unreachable',
            errorKind: 'repo_not_found',
          }),
        );
      });
    });

    describe('when the parser throws (descriptor unparseable)', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'abc',
          content: 'not really json',
        });
        mockParserRegistry.parse.mockImplementation(() => {
          throw new Error('parse error');
        });

        result = await job.runJob('job-bf-2', input, new AbortController());
      });

      it('persists state="bad_format"', () => {
        expect(result.state).toBe('bad_format');
      });

      it('updates the state with a fresh lastValidatedAt', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          expect.objectContaining({
            state: 'bad_format',
            lastValidatedAt: expect.any(Date),
            errorKind: null,
          }),
        );
      });
    });
  });

  describe('credential failures', () => {
    describe.each([401, 403])('when getFileFromRepo throws %i', (status) => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockRejectedValue({ response: { status } });
        result = await job.runJob('job-auth', input, new AbortController());
      });

      it('classifies the failure as auth_failed', () => {
        expect(result.errorKind).toBe('auth_failed');
      });

      it('persists state="unreachable" with errorKind=auth_failed', () => {
        expect(mockMarketplaceRepository.updateState).toHaveBeenCalledWith(
          marketplaceId,
          expect.objectContaining({
            state: 'unreachable',
            errorKind: 'auth_failed',
          }),
        );
      });
    });
  });

  describe('healthy reconcile clears error fields', () => {
    let result: MarketplaceReconciliationJobOutput;

    beforeEach(async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify(baseDescriptor.raw),
      });
      mockParserRegistry.parse.mockReturnValue({
        ...baseDescriptor,
        raw: { reformatted: true },
      });
      result = await job.runJob('job-healthy', input, new AbortController());
    });

    it('returns a null errorKind', () => {
      expect(result.errorKind).toBeNull();
    });

    it('patches errorKind and errorDetail to null', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch).toMatchObject({ errorKind: null, errorDetail: null });
    });
  });

  describe('pending sync PR', () => {
    beforeEach(() => {
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify(baseDescriptor.raw),
      });
      mockParserRegistry.parse.mockReturnValue({
        ...baseDescriptor,
        raw: { reformatted: true },
      });
    });

    describe('when an open sync PR exists', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.findOpenSyncPullRequest.mockResolvedValue({
          url: 'https://github.com/acme/market/pull/7',
          number: 7,
        });
        result = await job.runJob('job-pr', input, new AbortController());
      });

      it('returns the pending PR url', () => {
        expect(result.pendingPrUrl).toBe(
          'https://github.com/acme/market/pull/7',
        );
      });

      it('persists the pending PR url', () => {
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.pendingPrUrl).toBe(
          'https://github.com/acme/market/pull/7',
        );
      });
    });

    describe('when no open sync PR exists', () => {
      it('clears the pending PR url to null', async () => {
        mockGitPort.findOpenSyncPullRequest.mockResolvedValue(null);
        const result = await job.runJob(
          'job-pr2',
          input,
          new AbortController(),
        );
        expect(result.pendingPrUrl).toBeNull();
      });
    });

    describe('when the sync PR lookup throws', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockMarketplaceRepository.findById.mockResolvedValue({
          ...marketplace,
          pendingPrUrl: 'https://github.com/acme/market/pull/3',
        });
        mockGitPort.findOpenSyncPullRequest.mockRejectedValue(
          new Error('rate limited'),
        );
        result = await job.runJob('job-pr3', input, new AbortController());
      });

      it('does not flip the marketplace to unreachable', () => {
        expect(result.state).toBe('healthy');
      });

      it('falls back to the last known pending PR url', () => {
        expect(result.pendingPrUrl).toBe(
          'https://github.com/acme/market/pull/3',
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

  describe('distribution cross-check', () => {
    const distributionPackageId = createPackageId(uuidv4());

    const buildSuccessDistribution = (slug: string): MarketplaceDistribution =>
      ({
        id: createMarketplaceDistributionId(uuidv4()),
        organizationId,
        marketplaceId,
        packageId: distributionPackageId,
        pluginSlug: slug,
        authorId: userId,
        status: DistributionStatus.success,
        source: 'app',
      }) as unknown as MarketplaceDistribution;

    const buildPendingRemovalDistribution = (
      slug: string,
    ): MarketplaceDistribution =>
      ({
        id: createMarketplaceDistributionId(uuidv4()),
        organizationId,
        marketplaceId,
        packageId: distributionPackageId,
        pluginSlug: slug,
        authorId: userId,
        status: DistributionStatus.to_be_removed,
        source: 'app',
      }) as unknown as MarketplaceDistribution;

    describe('to_be_removed → removed terminal transition', () => {
      const pending = buildPendingRemovalDistribution('p1');
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        // Descriptor no longer carries the slug.
        const descriptorWithoutP1: MarketplaceDescriptor = {
          ...baseDescriptor,
          plugins: [{ slug: 'p2', name: 'Plugin 2' }],
        };
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'abc',
          content: JSON.stringify(descriptorWithoutP1.raw),
        });
        mockParserRegistry.parse.mockReturnValue(descriptorWithoutP1);
        mockMarketplaceDistributionRepository.findPendingRemovalsByMarketplaceId.mockResolvedValue(
          [pending],
        );
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [],
        );

        result = await job.runJob('job-x1', input, new AbortController());
      });

      it('flips the distribution to removed', () => {
        expect(
          mockMarketplaceDistributionRepository.updateStatus,
        ).toHaveBeenCalledWith(pending.id, {
          status: DistributionStatus.removed,
        });
      });

      it('does not stamp driftedPluginSlugs on this signal alone', () => {
        // descriptor differs (p1/p2 → p2) so descriptor diff yields drift —
        // but driftedPluginSlugs must be empty for this case.
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.descriptor?.driftedPluginSlugs).toBeUndefined();
      });

      it('still reports drift due to descriptor diff', () => {
        expect(result.state).toBe('drift');
      });
    });

    describe('drift detection on missing slug without a paired to_be_removed (AC9)', () => {
      const live = buildSuccessDistribution('p1');
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        // Descriptor is missing p1 but otherwise structurally similar.
        const driftDescriptor: MarketplaceDescriptor = {
          ...baseDescriptor,
          plugins: [{ slug: 'p2', name: 'Plugin 2' }],
        };
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'abc',
          content: JSON.stringify(driftDescriptor.raw),
        });
        mockParserRegistry.parse.mockReturnValue(driftDescriptor);
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [live],
        );
        mockMarketplaceDistributionRepository.findPendingRemovalsByMarketplaceId.mockResolvedValue(
          [],
        );

        result = await job.runJob('job-x2', input, new AbortController());
      });

      it('marks the marketplace as drift', () => {
        expect(result.state).toBe('drift');
      });

      it('persists driftedPluginSlugs containing the missing slug', () => {
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.descriptor?.driftedPluginSlugs).toEqual(['p1']);
      });
    });

    describe('drift suppression when a to_be_removed exists for the slug (AC10)', () => {
      const live = buildSuccessDistribution('p1');
      const pending = buildPendingRemovalDistribution('p1');
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        const descriptorWithoutP1: MarketplaceDescriptor = {
          ...baseDescriptor,
          plugins: [{ slug: 'p2', name: 'Plugin 2' }],
        };
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'abc',
          content: JSON.stringify(descriptorWithoutP1.raw),
        });
        mockParserRegistry.parse.mockReturnValue(descriptorWithoutP1);
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [live],
        );
        mockMarketplaceDistributionRepository.findPendingRemovalsByMarketplaceId.mockResolvedValue(
          [pending],
        );

        result = await job.runJob('job-x3', input, new AbortController());
      });

      it('does not include p1 in driftedPluginSlugs', () => {
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.descriptor?.driftedPluginSlugs).toBeUndefined();
      });

      it('still transitions the pending row to removed (terminal)', () => {
        expect(
          mockMarketplaceDistributionRepository.updateStatus,
        ).toHaveBeenCalledWith(pending.id, {
          status: DistributionStatus.removed,
        });
      });

      it('reports drift via descriptor diff path (not slug drift)', () => {
        expect(result.state).toBe('drift'); // descriptor differs
      });
    });

    describe('healthy retained when descriptor matches and all distributions accounted for', () => {
      const live = buildSuccessDistribution('p1');
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'abc',
          content: JSON.stringify(baseDescriptor.raw),
        });
        mockParserRegistry.parse.mockReturnValue({
          ...baseDescriptor,
          raw: { reformatted: true },
        });
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [live],
        );
        mockMarketplaceDistributionRepository.findPendingRemovalsByMarketplaceId.mockResolvedValue(
          [],
        );

        result = await job.runJob('job-x4', input, new AbortController());
      });

      it('persists state="healthy"', () => {
        expect(result.state).toBe('healthy');
      });

      it('does not write any distribution status update', () => {
        expect(
          mockMarketplaceDistributionRepository.updateStatus,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('getJobName', () => {
    it('returns a stable name keyed by marketplaceId', () => {
      const name = job.getJobName({ marketplaceId });
      expect(name).toBe(`marketplace-reconciliation-${marketplaceId}`);
    });
  });
});
