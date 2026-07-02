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
  Package,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../services/PackageService';
import { PackageVersionFingerprintService } from '../services/PackageVersionFingerprintService';
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
  let mockPackageService: jest.Mocked<PackageService>;
  let mockVersionFingerprintService: jest.Mocked<PackageVersionFingerprintService>;
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
      findPendingMergesByMarketplaceId: jest.fn().mockResolvedValue([]),
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

    mockPackageService = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<PackageService>;

    mockVersionFingerprintService = {
      compute: jest.fn().mockResolvedValue({
        recipes: {},
        standards: {},
        skills: {},
      }),
    } as unknown as jest.Mocked<PackageVersionFingerprintService>;

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
      mockPackageService,
      mockVersionFingerprintService,
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

  describe('healthy state — stored descriptor differs only by key order', () => {
    let result: MarketplaceReconciliationJobOutput;

    beforeEach(async () => {
      // The stored baseline round-trips through a Postgres jsonb column,
      // which re-sorts object keys. The parsed descriptor carries the
      // parser's insertion order. The comparison must treat them as equal.
      const jsonbOrderedMarketplace = {
        ...marketplace,
        descriptor: {
          ...baseDescriptor,
          plugins: [
            { name: 'Plugin 1', slug: 'p1' },
            { name: 'Plugin 2', slug: 'p2' },
          ],
        },
      } as unknown as Marketplace;
      mockMarketplaceRepository.findById.mockResolvedValue(
        jsonbOrderedMarketplace,
      );
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify(baseDescriptor.raw),
      });
      mockParserRegistry.parse.mockReturnValue({
        ...baseDescriptor,
        raw: { reformatted: true },
      });

      result = await job.runJob('job-key-order', input, new AbortController());
    });

    it('reports healthy — key order is not a descriptor change', () => {
      expect(result.state).toBe('healthy');
    });

    it('does not refresh the stored descriptor', () => {
      const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
      expect(patch.descriptor).toBeUndefined();
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

    describe('when getFileFromRepo returns null and the probe reports auth failure', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
        mockGitPort.checkMarketplaceRepoExists.mockResolvedValue({
          exists: false,
          reason: 'auth_failed',
        });

        result = await job.runJob('job-bf-auth', input, new AbortController());
      });

      it('classifies the failure as auth_failed', () => {
        expect(result.errorKind).toBe('auth_failed');
      });

      it('surfaces the credential error detail', () => {
        expect(result.errorDetail).toBe(
          'The marketplace credentials are invalid or expired. Reconnect the Git provider.',
        );
      });
    });

    describe('when getFileFromRepo returns null and the probe reports no reason', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
        mockGitPort.checkMarketplaceRepoExists.mockResolvedValue({
          exists: false,
        });

        result = await job.runJob(
          'job-bf-noreason',
          input,
          new AbortController(),
        );
      });

      it('defaults the classification to network_transient', () => {
        expect(result.errorKind).toBe('network_transient');
      });

      it('surfaces the transient error detail', () => {
        expect(result.errorDetail).toBe(
          'The marketplace repository is temporarily unreachable.',
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

  describe('error paths carry forward last-known live-state fields', () => {
    let result: MarketplaceReconciliationJobOutput;

    beforeEach(async () => {
      mockMarketplaceRepository.findById.mockResolvedValue({
        ...marketplace,
        pendingPrUrl: 'https://github.com/acme/plugins/pull/5',
        outdatedPluginSlugs: ['p1'],
      });
      mockGitPort.getFileFromRepo.mockRejectedValue(
        new Error('upstream timeout'),
      );

      result = await job.runJob('job-carry', input, new AbortController());
    });

    it('echoes the last-known pending PR url on a fetch failure', () => {
      expect(result.pendingPrUrl).toBe(
        'https://github.com/acme/plugins/pull/5',
      );
    });

    it('echoes the last-known outdated slugs on a fetch failure', () => {
      expect(result.outdatedPluginSlugs).toEqual(['p1']);
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

  describe('outdated plugin detection', () => {
    const packageId = createPackageId(uuidv4());

    const makeSuccessDistribution = (
      over: Partial<MarketplaceDistribution> = {},
    ): MarketplaceDistribution =>
      ({
        id: createMarketplaceDistributionId(uuidv4()),
        organizationId,
        marketplaceId,
        packageId,
        pluginSlug: 'p1',
        authorId: userId,
        status: DistributionStatus.success,
        source: 'app',
        createdAt: new Date('2026-01-02T00:00:00Z'),
        ...over,
      }) as unknown as MarketplaceDistribution;

    beforeEach(() => {
      // Healthy descriptor read so the success path is exercised.
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'abc',
        content: JSON.stringify(baseDescriptor.raw),
      });
      mockParserRegistry.parse.mockReturnValue({
        ...baseDescriptor,
        raw: { reformatted: true },
      });
      mockPackageService.findById.mockResolvedValue({
        id: packageId,
        recipes: [],
        standards: [],
        skills: [],
      } as unknown as Package);
    });

    describe('when the current fingerprint differs from the published one', () => {
      let result: MarketplaceReconciliationJobOutput;

      beforeEach(async () => {
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [
            makeSuccessDistribution({
              versionFingerprint: {
                recipes: { r: 1 },
                standards: {},
                skills: {},
              },
            }),
          ],
        );
        mockVersionFingerprintService.compute.mockResolvedValue({
          recipes: { r: 2 },
          standards: {},
          skills: {},
        });
        result = await job.runJob('job-out', input, new AbortController());
      });

      it('flags the plugin slug as outdated', () => {
        expect(result.outdatedPluginSlugs).toEqual(['p1']);
      });

      it('persists the outdated slugs', () => {
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.outdatedPluginSlugs).toEqual(['p1']);
      });
    });

    describe('when the current fingerprint equals the published one', () => {
      it('reports no outdated plugins', async () => {
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [
            makeSuccessDistribution({
              versionFingerprint: {
                recipes: { r: 1 },
                standards: {},
                skills: {},
              },
            }),
          ],
        );
        mockVersionFingerprintService.compute.mockResolvedValue({
          recipes: { r: 1 },
          standards: {},
          skills: {},
        });
        const result = await job.runJob(
          'job-out2',
          input,
          new AbortController(),
        );
        expect(result.outdatedPluginSlugs).toBeNull();
      });
    });

    describe('when the distribution predates fingerprints', () => {
      it('never marks the plugin outdated', async () => {
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [makeSuccessDistribution({ versionFingerprint: undefined })],
        );
        const result = await job.runJob(
          'job-out3',
          input,
          new AbortController(),
        );
        expect(result.outdatedPluginSlugs).toBeNull();
      });
    });

    describe('when a package has multiple success distributions', () => {
      it('compares only the most recent one', async () => {
        mockMarketplaceDistributionRepository.findSuccessfulByMarketplaceId.mockResolvedValue(
          [
            makeSuccessDistribution({
              createdAt: new Date('2026-02-01T00:00:00Z'),
              versionFingerprint: {
                recipes: { r: 2 },
                standards: {},
                skills: {},
              },
            }),
            makeSuccessDistribution({
              createdAt: new Date('2026-01-01T00:00:00Z'),
              versionFingerprint: {
                recipes: { r: 1 },
                standards: {},
                skills: {},
              },
            }),
          ],
        );
        mockVersionFingerprintService.compute.mockResolvedValue({
          recipes: { r: 2 },
          standards: {},
          skills: {},
        });
        const result = await job.runJob(
          'job-out4',
          input,
          new AbortController(),
        );
        expect(result.outdatedPluginSlugs).toBeNull();
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

    const buildPendingMergeDistribution = (
      slug: string,
      contentHash: string,
    ): MarketplaceDistribution =>
      ({
        id: createMarketplaceDistributionId(uuidv4()),
        organizationId,
        marketplaceId,
        packageId: distributionPackageId,
        pluginSlug: slug,
        authorId: userId,
        status: DistributionStatus.pending_merge,
        source: 'app',
        contentHash,
      }) as unknown as MarketplaceDistribution;

    const buildLockContent = (plugins: Record<string, string>): string =>
      JSON.stringify({
        schemaVersion: 1,
        plugins: Object.fromEntries(
          Object.entries(plugins).map(([slug, contentHash]) => [
            slug,
            {
              version: '1.0.0',
              contentHash,
              lastPublishedAt: '2024-01-01T00:00:00Z',
              lastPublishedBy: userId,
            },
          ]),
        ),
      });

    describe('pending_merge → success promotion', () => {
      describe('when a first publish landed on the default branch (lock hash matches)', () => {
        const pendingMerge = buildPendingMergeDistribution('p3', 'hash-p3');
        const mergedDescriptor: MarketplaceDescriptor = {
          ...baseDescriptor,
          plugins: [
            ...baseDescriptor.plugins,
            { slug: 'p3', name: 'Plugin 3' },
          ],
        };
        let result: MarketplaceReconciliationJobOutput;

        beforeEach(async () => {
          mockGitPort.getFileFromRepo.mockImplementation(async (_repo, path) =>
            path === 'packmind-lock.json'
              ? {
                  sha: 'lock-sha',
                  content: buildLockContent({ p3: 'hash-p3' }),
                }
              : {
                  sha: 'abc',
                  content: JSON.stringify(mergedDescriptor.raw),
                },
          );
          mockParserRegistry.parse.mockReturnValue(mergedDescriptor);
          mockMarketplaceDistributionRepository.findPendingMergesByMarketplaceId.mockResolvedValue(
            [pendingMerge],
          );

          result = await job.runJob('job-pm1', input, new AbortController());
        });

        it('promotes the pending row to success with a publishConfirmedAt stamp', () => {
          expect(
            mockMarketplaceDistributionRepository.updateStatus,
          ).toHaveBeenCalledWith(pendingMerge.id, {
            status: DistributionStatus.success,
            publishConfirmedAt: expect.any(Date),
          });
        });

        it('reports healthy — the confirmed publish explains the descriptor diff', () => {
          expect(result.state).toBe('healthy');
        });

        it('persists the refreshed descriptor as the new comparison baseline', () => {
          const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
          expect(patch.pluginCount).toBe(mergedDescriptor.plugins.length);
        });
      });

      describe('when an update publish landed (slug already in descriptor, lock hash matches)', () => {
        const pendingMerge = buildPendingMergeDistribution('p1', 'hash-p1-v2');

        beforeEach(async () => {
          mockGitPort.getFileFromRepo.mockImplementation(async (_repo, path) =>
            path === 'packmind-lock.json'
              ? {
                  sha: 'lock-sha',
                  content: buildLockContent({ p1: 'hash-p1-v2' }),
                }
              : {
                  sha: 'abc',
                  content: JSON.stringify(baseDescriptor.raw),
                },
          );
          mockParserRegistry.parse.mockReturnValue({
            ...baseDescriptor,
            raw: { reformatted: true },
          });
          mockMarketplaceDistributionRepository.findPendingMergesByMarketplaceId.mockResolvedValue(
            [pendingMerge],
          );

          await job.runJob('job-pm2', input, new AbortController());
        });

        it('promotes the pending row to success', () => {
          expect(
            mockMarketplaceDistributionRepository.updateStatus,
          ).toHaveBeenCalledWith(pendingMerge.id, {
            status: DistributionStatus.success,
            publishConfirmedAt: expect.any(Date),
          });
        });
      });

      describe('when the lock still carries the previous content hash (PR not merged)', () => {
        const pendingMerge = buildPendingMergeDistribution('p1', 'hash-p1-v2');
        let result: MarketplaceReconciliationJobOutput;

        beforeEach(async () => {
          mockGitPort.getFileFromRepo.mockImplementation(async (_repo, path) =>
            path === 'packmind-lock.json'
              ? {
                  sha: 'lock-sha',
                  content: buildLockContent({ p1: 'hash-p1-v1' }),
                }
              : {
                  sha: 'abc',
                  content: JSON.stringify(baseDescriptor.raw),
                },
          );
          mockParserRegistry.parse.mockReturnValue({
            ...baseDescriptor,
            raw: { reformatted: true },
          });
          mockMarketplaceDistributionRepository.findPendingMergesByMarketplaceId.mockResolvedValue(
            [pendingMerge],
          );

          result = await job.runJob('job-pm3', input, new AbortController());
        });

        it('leaves the row in pending_merge', () => {
          expect(
            mockMarketplaceDistributionRepository.updateStatus,
          ).not.toHaveBeenCalled();
        });

        it('keeps the marketplace healthy', () => {
          expect(result.state).toBe('healthy');
        });
      });

      describe('when the lock file cannot be read', () => {
        const pendingMerge = buildPendingMergeDistribution('p1', 'hash-p1-v2');
        let result: MarketplaceReconciliationJobOutput;

        beforeEach(async () => {
          mockGitPort.getFileFromRepo.mockImplementation(
            async (_repo, path) => {
              if (path === 'packmind-lock.json') {
                throw new Error('network blip');
              }
              return {
                sha: 'abc',
                content: JSON.stringify(baseDescriptor.raw),
              };
            },
          );
          mockParserRegistry.parse.mockReturnValue({
            ...baseDescriptor,
            raw: { reformatted: true },
          });
          mockMarketplaceDistributionRepository.findPendingMergesByMarketplaceId.mockResolvedValue(
            [pendingMerge],
          );

          result = await job.runJob('job-pm4', input, new AbortController());
        });

        it('postpones the confirmation instead of failing the reconcile', () => {
          expect(
            mockMarketplaceDistributionRepository.updateStatus,
          ).not.toHaveBeenCalled();
        });

        it('still completes the reconcile as healthy', () => {
          expect(result.state).toBe('healthy');
        });
      });

      describe('when no pending merges exist', () => {
        beforeEach(async () => {
          mockGitPort.getFileFromRepo.mockResolvedValue({
            sha: 'abc',
            content: JSON.stringify(baseDescriptor.raw),
          });
          mockParserRegistry.parse.mockReturnValue({
            ...baseDescriptor,
            raw: { reformatted: true },
          });

          await job.runJob('job-pm5', input, new AbortController());
        });

        it('does not fetch the lock file', () => {
          expect(mockGitPort.getFileFromRepo).not.toHaveBeenCalledWith(
            gitRepo,
            'packmind-lock.json',
            gitRepo.branch,
          );
        });
      });
    });

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
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.descriptor?.driftedPluginSlugs).toBeUndefined();
      });

      it('reports healthy — the confirmed removal explains the descriptor diff', () => {
        expect(result.state).toBe('healthy');
      });

      it('persists the refreshed descriptor as the new comparison baseline', () => {
        const [, patch] = mockMarketplaceRepository.updateState.mock.calls[0];
        expect(patch.pluginCount).toBe(1);
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

    describe('drift detection dedup across republishes of the same plugin', () => {
      // Each republish writes a new `success` row for the same plugin slug.
      // The drift list must collapse them so the banner / state badge shows
      // one entry per plugin, not one entry per historical publish.
      const liveA = buildSuccessDistribution('p1');
      const liveB = buildSuccessDistribution('p1');
      const liveC = buildSuccessDistribution('p1');
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
          [liveA, liveB, liveC],
        );
        mockMarketplaceDistributionRepository.findPendingRemovalsByMarketplaceId.mockResolvedValue(
          [],
        );

        result = await job.runJob('job-x2b', input, new AbortController());
      });

      it('still flags the marketplace as drift', () => {
        expect(result.state).toBe('drift');
      });

      it('reports the slug only once in driftedPluginSlugs', () => {
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

      it('reports healthy — the confirmed removal explains the descriptor diff', () => {
        expect(result.state).toBe('healthy');
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
