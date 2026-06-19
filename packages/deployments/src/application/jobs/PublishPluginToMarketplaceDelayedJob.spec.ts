import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createSpaceId,
  createUserId,
  DistributionStatus,
  GitCommit,
  GitProviderVendors,
  GitRepo,
  IGitPort,
  MarketplaceDescriptor,
  Package,
  PluginPublishedEvent,
  PluginPublishFailedEvent,
  PublishPluginToMarketplaceJobInput,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { marketplaceFactory } from '../../infra/repositories/__factories__/marketplaceFactory';
import { marketplaceDistributionFactory } from '../../infra/repositories/__factories__/marketplaceDistributionFactory';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../services/PackageService';
import { buildPluginContentHash } from '../services/buildPluginContentHash';
import {
  MARKETPLACE_SYNC_BRANCH,
  MARKETPLACE_SYNC_PR_TITLE,
} from '../services/marketplaceSyncPullRequest';
import {
  PluginRenderer,
  PluginRendererResult,
  PublishPluginToMarketplaceDelayedJob,
} from './PublishPluginToMarketplaceDelayedJob';
import { PackageVersionFingerprintService } from '../services/PackageVersionFingerprintService';

describe('PublishPluginToMarketplaceDelayedJob', () => {
  const marketplaceDistributionId = createMarketplaceDistributionId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  const input: PublishPluginToMarketplaceJobInput = {
    marketplaceDistributionId,
    marketplaceId,
    packageId,
    organizationId,
    userId,
  };

  const distribution = marketplaceDistributionFactory({
    id: marketplaceDistributionId,
    organizationId,
    marketplaceId,
    packageId,
    pluginSlug: 'security',
    authorId: userId,
    status: DistributionStatus.in_progress,
  });

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

  const pkg: Package = {
    id: packageId,
    name: 'Security',
    slug: 'security',
    description: 'Security curated package',
    spaceId,
    createdBy: userId,
    recipes: [],
    standards: [],
    skills: [],
  };

  const gitRepo: GitRepo = {
    id: gitRepoId,
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    providerId: gitProviderId,
    type: 'marketplace',
  };

  const renderedFiles: PluginRendererResult = {
    files: [
      { path: 'plugins/security/plugin.json', content: '{"name":"Security"}' },
      { path: 'plugins/security/commands/foo.md', content: '# foo' },
    ],
    pluginName: 'Security',
    pluginVersion: '0.1.0',
  };

  const descriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'ACME Marketplace',
    plugins: [],
    raw: { name: 'ACME Marketplace', plugins: [] },
  };

  const successfulCommit: GitCommit = {
    sha: 'commit-sha-1',
  } as unknown as GitCommit;

  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockParserRegistry: jest.Mocked<MarketplaceDescriptorParserRegistry>;
  let mockRenderer: jest.MockedFunction<PluginRenderer>;
  let mockVersionFingerprintService: jest.Mocked<PackageVersionFingerprintService>;
  let mockEventEmitter: jest.Mocked<PackmindEventEmitterService>;
  let job: PublishPluginToMarketplaceDelayedJob;

  beforeEach(() => {
    mockMarketplaceDistributionRepository = {
      findById: jest.fn().mockResolvedValue(distribution),
      findLatestByPackageAndMarketplace: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      add: jest.fn(),
      findByMarketplaceId: jest.fn(),
      findByPackageId: jest.fn(),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockMarketplaceRepository = {
      findById: jest.fn().mockResolvedValue(marketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockPackageService = {
      findById: jest.fn().mockResolvedValue(pkg),
    } as unknown as jest.Mocked<PackageService>;

    mockGitPort = {
      findMarketplaceGitRepoById: jest.fn().mockResolvedValue(gitRepo),
      commitToGit: jest.fn().mockResolvedValue(successfulCommit),
      // By default the descriptor is served as a minimal valid JSON and the
      // packmind-lock.json file is reported as missing — first-publish path.
      getFileFromRepo: jest.fn().mockImplementation(async (_repo, path) => {
        if (path === 'packmind-lock.json') {
          return null;
        }
        return { sha: 'sha-1', content: '{}' };
      }),
      // First-publish ever: the rolling sync branch doesn't exist yet, so
      // the job reads descriptor + lock from the marketplace's default
      // branch and the resolver returns that branch.
      checkBranchExists: jest.fn().mockResolvedValue(false),
      createBranchFromBase: jest.fn().mockResolvedValue(undefined),
      openOrUpdatePullRequest: jest.fn().mockResolvedValue({
        url: 'https://github.com/acme/plugins/pull/1',
        number: 1,
        wasCreated: true,
      }),
      listProviders: jest.fn().mockResolvedValue({
        providers: [
          {
            id: gitProviderId,
            source: GitProviderVendors.github,
            organizationId,
            url: 'https://api.github.com',
            authMethod: 'token',
            hasAuth: true,
          },
        ],
      }),
    } as unknown as jest.Mocked<IGitPort>;

    mockParserRegistry = {
      parse: jest.fn().mockReturnValue(descriptor),
    } as unknown as jest.Mocked<MarketplaceDescriptorParserRegistry>;

    mockRenderer = jest.fn().mockResolvedValue(renderedFiles);

    mockVersionFingerprintService = {
      compute: jest.fn().mockResolvedValue({
        recipes: {},
        standards: {},
        skills: {},
      }),
    } as unknown as jest.Mocked<PackageVersionFingerprintService>;

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    job = new PublishPluginToMarketplaceDelayedJob(
      async () => ({}) as never,
      mockMarketplaceDistributionRepository,
      mockMarketplaceRepository,
      mockPackageService,
      mockGitPort,
      mockParserRegistry,
      mockRenderer,
      mockVersionFingerprintService,
      mockEventEmitter,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('on success', () => {
    beforeEach(async () => {
      await job.runJob('job-1', input, new AbortController());
    });

    it('pushes the rendered files + descriptor to the rolling sync branch', () => {
      expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
        expect.objectContaining({ branch: MARKETPLACE_SYNC_BRANCH }),
        expect.arrayContaining([
          expect.objectContaining({ path: 'plugins/security/plugin.json' }),
          expect.objectContaining({ path: '.claude-plugin/marketplace.json' }),
        ]),
        MARKETPLACE_SYNC_PR_TITLE,
      );
    });

    it('includes the packmind-lock.json file at the repo root in the commit', () => {
      const committedFiles = mockGitPort.commitToGit.mock.calls[0][1] as Array<{
        path: string;
        content: string;
      }>;
      const lockFile = committedFiles.find(
        (f) => f.path === 'packmind-lock.json',
      );
      expect(lockFile).toBeDefined();
    });

    it('writes the lock entry with the expected version and contentHash', () => {
      const committedFiles = mockGitPort.commitToGit.mock.calls[0][1] as Array<{
        path: string;
        content: string;
      }>;
      const lockFile = committedFiles.find(
        (f) => f.path === 'packmind-lock.json',
      );
      const lock = JSON.parse(lockFile?.content ?? '{}');
      expect(lock.plugins.security).toMatchObject({
        version: '0.1.0',
        contentHash: expect.any(String),
        lastPublishedBy: userId,
        lastPublishedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
      });
    });

    it('writes a lock containing exactly one plugin slug on first publish', () => {
      const committedFiles = mockGitPort.commitToGit.mock.calls[0][1] as Array<{
        path: string;
        content: string;
      }>;
      const lockFile = committedFiles.find(
        (f) => f.path === 'packmind-lock.json',
      );
      const lock = JSON.parse(lockFile?.content ?? '{}');
      expect(Object.keys(lock.plugins)).toEqual(['security']);
    });

    it('does not embed packmindLock inside the descriptor commit', () => {
      const committedFiles = mockGitPort.commitToGit.mock.calls[0][1] as Array<{
        path: string;
        content: string;
      }>;
      const descriptorCommit = committedFiles.find(
        (f) => f.path === '.claude-plugin/marketplace.json',
      );
      const parsed = JSON.parse(descriptorCommit?.content ?? '{}');
      expect(parsed.packmindLock).toBeUndefined();
    });

    describe('the plugin entry written into the descriptor', () => {
      let pluginEntry: {
        slug?: string;
        name?: string;
        version?: string;
        description?: string;
        source?: { source?: string; url?: string; path?: string };
      };

      beforeEach(() => {
        const committedFiles = mockGitPort.commitToGit.mock
          .calls[0][1] as Array<{
          path: string;
          content: string;
        }>;
        const descriptorCommit = committedFiles.find(
          (f) => f.path === '.claude-plugin/marketplace.json',
        );
        const parsed = JSON.parse(descriptorCommit?.content ?? '{}') as {
          plugins: Array<typeof pluginEntry>;
        };
        pluginEntry = parsed.plugins.find((p) => p.slug === 'security') ?? {};
      });

      it('carries a git-subdir source block', () => {
        expect(pluginEntry.source?.source).toBe('git-subdir');
      });

      it('points the source url at the marketplace HTTPS clone URL', () => {
        expect(pluginEntry.source?.url).toBe(
          'https://github.com/acme/plugins.git',
        );
      });

      it('targets the plugins/{slug} subdirectory in the source path', () => {
        expect(pluginEntry.source?.path).toBe('plugins/security');
      });
    });

    it('ensures the rolling-PR branch exists before committing', () => {
      expect(mockGitPort.createBranchFromBase).toHaveBeenCalledWith(
        gitRepo,
        MARKETPLACE_SYNC_BRANCH,
      );
    });

    it('ensures the branch before pushing the commit', () => {
      const branchCallOrder =
        mockGitPort.createBranchFromBase.mock.invocationCallOrder[0];
      const commitCallOrder =
        mockGitPort.commitToGit.mock.invocationCallOrder[0];
      expect(branchCallOrder).toBeLessThan(commitCallOrder);
    });

    it('updates the distribution status to pending_merge with a content hash', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.pending_merge,
          gitCommit: successfulCommit.sha,
          contentHash: expect.any(String),
        }),
      );
    });

    it('records the artifact-version fingerprint computed by the service', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          versionFingerprint: { recipes: {}, standards: {}, skills: {} },
        }),
      );
    });

    it('opens the rolling pull request after the commit lands', () => {
      expect(mockGitPort.openOrUpdatePullRequest).toHaveBeenCalledWith(
        gitRepo,
        expect.objectContaining({
          head: MARKETPLACE_SYNC_BRANCH,
          title: MARKETPLACE_SYNC_PR_TITLE,
          body: expect.any(String),
        }),
      );
    });

    it('persists the PR URL on the pending_merge distribution row', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          prUrl: 'https://github.com/acme/plugins/pull/1',
        }),
      );
    });

    describe('PluginPublishedEvent emission', () => {
      let emitted: PluginPublishedEvent;

      beforeEach(() => {
        emitted = mockEventEmitter.emit.mock
          .calls[0][0] as PluginPublishedEvent;
      });

      it('emits a PluginPublishedEvent', () => {
        expect(emitted).toBeInstanceOf(PluginPublishedEvent);
      });

      it('marks the published event with wasNoop=false', () => {
        expect(emitted.payload.wasNoop).toBe(false);
      });

      it('carries the rolling PR URL on the event payload', () => {
        expect(emitted.payload.prUrl).toBe(
          'https://github.com/acme/plugins/pull/1',
        );
      });
    });
  });

  describe('when the renderer supplies a plugin description', () => {
    let pluginEntry: { description?: string };

    beforeEach(async () => {
      mockRenderer.mockResolvedValue({
        ...renderedFiles,
        pluginDescription:
          'Packmind - space @engineering: Security curated package',
      });

      await job.runJob('job-with-description', input, new AbortController());

      const committedFiles = mockGitPort.commitToGit.mock.calls[0][1] as Array<{
        path: string;
        content: string;
      }>;
      const descriptorCommit = committedFiles.find(
        (f) => f.path === '.claude-plugin/marketplace.json',
      );
      const parsed = JSON.parse(descriptorCommit?.content ?? '{}') as {
        plugins: Array<{ slug?: string; description?: string }>;
      };
      pluginEntry = parsed.plugins.find((p) => p.slug === 'security') ?? {};
    });

    it('writes the description into the descriptor entry', () => {
      expect(pluginEntry.description).toBe(
        'Packmind - space @engineering: Security curated package',
      );
    });
  });

  describe('when the rolling sync branch does not yet exist', () => {
    beforeEach(async () => {
      mockGitPort.checkBranchExists.mockResolvedValue(false);
      await job.runJob('job-no-sync', input, new AbortController());
    });

    it('reads the descriptor from the marketplace default branch', () => {
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        '.claude-plugin/marketplace.json',
        gitRepo.branch,
      );
    });

    it('reads the packmind-lock.json from the marketplace default branch', () => {
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        'packmind-lock.json',
        gitRepo.branch,
      );
    });

    it('probes the rolling sync branch before fetching the descriptor', () => {
      const checkOrder =
        mockGitPort.checkBranchExists.mock.invocationCallOrder[0];
      const fetchOrder =
        mockGitPort.getFileFromRepo.mock.invocationCallOrder[0];
      expect(checkOrder).toBeLessThan(fetchOrder);
    });

    it('creates the sync branch only after reading descriptor + lock', () => {
      const fetchOrder = Math.max(
        ...mockGitPort.getFileFromRepo.mock.invocationCallOrder,
      );
      const branchOrder =
        mockGitPort.createBranchFromBase.mock.invocationCallOrder[0];
      expect(fetchOrder).toBeLessThan(branchOrder);
    });
  });

  describe('when the rolling sync branch already exists', () => {
    beforeEach(async () => {
      mockGitPort.checkBranchExists.mockResolvedValue(true);
      await job.runJob('job-sync-exists', input, new AbortController());
    });

    it('reads the descriptor from the rolling sync branch', () => {
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        '.claude-plugin/marketplace.json',
        MARKETPLACE_SYNC_BRANCH,
      );
    });

    it('reads the packmind-lock.json from the rolling sync branch', () => {
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        'packmind-lock.json',
        MARKETPLACE_SYNC_BRANCH,
      );
    });
  });

  describe('on republish over an existing managed plugin entry', () => {
    beforeEach(async () => {
      // Simulate the descriptor already containing the managed plugin from a
      // previous publish — the mutator must rewrite (not duplicate) the entry
      // and keep the source block populated.
      mockParserRegistry.parse.mockReturnValue({
        ...descriptor,
        plugins: [
          {
            slug: 'security',
            name: 'Security',
            version: '0.0.1',
            source: {
              source: 'git-subdir',
              url: 'https://github.com/acme/plugins.git',
              path: 'plugins/security',
            },
          },
        ],
      });

      // Simulate the standalone packmind-lock.json having the slug listed
      // under `plugins` so the collision check classifies the entry as
      // Packmind-managed (and therefore not a name conflict).
      mockGitPort.getFileFromRepo.mockImplementation(async (_repo, path) => {
        if (path === 'packmind-lock.json') {
          return {
            sha: 'lock-sha',
            content: JSON.stringify({
              schemaVersion: 1,
              plugins: {
                security: {
                  version: '0.0.1',
                  contentHash: 'old-hash',
                  lastPublishedAt: new Date().toISOString(),
                  lastPublishedBy: userId,
                },
              },
            }),
          };
        }
        return { sha: 'sha-1', content: '{}' };
      });

      await job.runJob('job-republish', input, new AbortController());
    });

    it('still writes a complete git-subdir source block on the entry', () => {
      const committedFiles = mockGitPort.commitToGit.mock.calls[0][1] as Array<{
        path: string;
        content: string;
      }>;
      const descriptorCommit = committedFiles.find(
        (f) => f.path === '.claude-plugin/marketplace.json',
      );
      const parsed = JSON.parse(descriptorCommit?.content ?? '{}') as {
        plugins: Array<{
          slug: string;
          source?: { source?: string; url?: string; path?: string };
        }>;
      };
      const entry = parsed.plugins.find((p) => p.slug === 'security');
      expect(entry?.source).toEqual({
        source: 'git-subdir',
        url: 'https://github.com/acme/plugins.git',
        path: 'plugins/security',
      });
    });
  });

  describe('when openOrUpdatePullRequest returns an existing PR (wasCreated=false)', () => {
    beforeEach(async () => {
      mockGitPort.openOrUpdatePullRequest.mockResolvedValue({
        url: 'https://github.com/acme/plugins/pull/42',
        number: 42,
        wasCreated: false,
      });

      await job.runJob('job-existing-pr', input, new AbortController());
    });

    it('persists the existing PR URL on the pending_merge distribution row', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.pending_merge,
          prUrl: 'https://github.com/acme/plugins/pull/42',
        }),
      );
    });
  });

  describe('when openOrUpdatePullRequest fails after a successful commit', () => {
    beforeEach(async () => {
      mockGitPort.openOrUpdatePullRequest.mockRejectedValue(
        new Error('GitHub 503'),
      );

      await job.runJob('job-pr-failure', input, new AbortController());
    });

    it('still records a pending_merge status', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.pending_merge,
        }),
      );
    });

    it('persists an undefined prUrl on the row', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({ prUrl: undefined }),
      );
    });

    it('emits a PluginPublishedEvent (not a failure event)', () => {
      const emitted = mockEventEmitter.emit.mock
        .calls[0][0] as PluginPublishedEvent;
      expect(emitted).toBeInstanceOf(PluginPublishedEvent);
    });
  });

  describe('when the previous success row has the same content hash', () => {
    beforeEach(async () => {
      // Derive the expected hash from the rendered files so we do not need to
      // run a probe job (which would require resetting mocks mid-test).
      const expectedHash = buildPluginContentHash(
        renderedFiles.files.map((f) => ({ path: f.path, content: f.content })),
      );

      mockMarketplaceDistributionRepository.findLatestByPackageAndMarketplace.mockResolvedValue(
        marketplaceDistributionFactory({
          status: DistributionStatus.success,
          contentHash: expectedHash,
        }),
      );

      await job.runJob('job-2', input, new AbortController());
    });

    it('does not push any commit to git', () => {
      expect(mockGitPort.commitToGit).not.toHaveBeenCalled();
    });

    it('records no_changes status with the unchanged content hash', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.no_changes,
          contentHash: expect.any(String),
        }),
      );
    });

    it('emits a PluginPublishedEvent with wasNoop=true', () => {
      const emitted = mockEventEmitter.emit.mock
        .calls[0][0] as PluginPublishedEvent;
      expect(emitted.payload.wasNoop).toBe(true);
    });
  });

  describe('when the previous pending_merge row has the same content hash', () => {
    beforeEach(async () => {
      const expectedHash = buildPluginContentHash(
        renderedFiles.files.map((f) => ({ path: f.path, content: f.content })),
      );

      mockMarketplaceDistributionRepository.findLatestByPackageAndMarketplace.mockResolvedValue(
        marketplaceDistributionFactory({
          status: DistributionStatus.pending_merge,
          contentHash: expectedHash,
        }),
      );

      await job.runJob('job-pending-noop', input, new AbortController());
    });

    it('does not push any commit to git', () => {
      expect(mockGitPort.commitToGit).not.toHaveBeenCalled();
    });

    it('records no_changes status since the content already awaits merge on the sync branch', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.no_changes,
        }),
      );
    });
  });

  describe('when the descriptor is missing at job time', () => {
    beforeEach(async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      await job.runJob('job-3', input, new AbortController());
    });

    it('records failure with failureReason=descriptor_missing', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.failure,
          failureReason: 'descriptor_missing',
        }),
      );
    });

    describe('PluginPublishFailedEvent emission', () => {
      let emitted: PluginPublishFailedEvent;

      beforeEach(() => {
        emitted = mockEventEmitter.emit.mock
          .calls[0][0] as PluginPublishFailedEvent;
      });

      it('emits a PluginPublishFailedEvent', () => {
        expect(emitted).toBeInstanceOf(PluginPublishFailedEvent);
      });

      it('carries the matching failureReason on the event', () => {
        expect(emitted.payload.failureReason).toBe('descriptor_missing');
      });
    });
  });

  describe('when commitToGit reports NO_CHANGES_DETECTED', () => {
    beforeEach(async () => {
      mockGitPort.commitToGit.mockRejectedValue(
        new Error('NO_CHANGES_DETECTED'),
      );
      await job.runJob('job-4', input, new AbortController());
    });

    it('records no_changes status', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.no_changes,
        }),
      );
    });

    it('emits a PluginPublishedEvent with wasNoop=true', () => {
      const emitted = mockEventEmitter.emit.mock
        .calls[0][0] as PluginPublishedEvent;
      expect(emitted.payload.wasNoop).toBe(true);
    });

    it('still ensures the rolling PR so a branch orphaned by a prior failed publish self-heals', () => {
      expect(mockGitPort.openOrUpdatePullRequest).toHaveBeenCalledWith(
        gitRepo,
        expect.objectContaining({ head: MARKETPLACE_SYNC_BRANCH }),
      );
    });
  });

  describe('when an unmanaged name collision is detected at job time', () => {
    beforeEach(async () => {
      mockParserRegistry.parse.mockReturnValue({
        ...descriptor,
        plugins: [{ slug: 'security', name: 'Security (unmanaged)' }],
      });
      await job.runJob('job-5', input, new AbortController());
    });

    it('records failure with failureReason=name_conflict_unmanaged', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.failure,
          failureReason: 'name_conflict_unmanaged',
        }),
      );
    });
  });

  describe('on generic failure', () => {
    beforeEach(async () => {
      mockGitPort.commitToGit.mockRejectedValue(new Error('upstream 503'));
      await job.runJob('job-6', input, new AbortController());
    });

    it('records failure with failureReason=other', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.failure,
          failureReason: 'other',
        }),
      );
    });
  });

  describe('when packmind-lock.json is malformed', () => {
    beforeEach(async () => {
      mockGitPort.getFileFromRepo.mockImplementation(async (_repo, path) => {
        if (path === 'packmind-lock.json') {
          return { sha: 'sha-lock', content: 'not-valid-json' };
        }
        return { sha: 'sha-1', content: '{}' };
      });
      await job.runJob('job-lock-malformed', input, new AbortController());
    });

    it('records failure with failureReason=descriptor_missing', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).toHaveBeenCalledWith(
        marketplaceDistributionId,
        expect.objectContaining({
          status: DistributionStatus.failure,
          failureReason: 'descriptor_missing',
        }),
      );
    });
  });
});
