import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import { GitRepoService } from '@packmind/git';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceDistributionId,
  createMarketplaceId,
  createOrganizationId,
  createPackageId,
  createUserId,
  DeleteItemType,
  DistributionStatus,
  GitCommit,
  GitRepo,
  IGitPort,
  MarketplaceDescriptor,
  RemovePluginFromMarketplaceJobInput,
} from '@packmind/types';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { marketplaceFactory } from '../../infra/repositories/__factories__/marketplaceFactory';
import { marketplaceDistributionFactory } from '../../infra/repositories/__factories__/marketplaceDistributionFactory';
import { MarketplaceDescriptorParserRegistry } from '../services/MarketplaceDescriptorParserRegistry';
import {
  MARKETPLACE_SYNC_BRANCH,
  MARKETPLACE_SYNC_PR_TITLE,
} from '../services/marketplaceSyncPullRequest';
import { RemovePluginFromMarketplaceDelayedJob } from './RemovePluginFromMarketplaceDelayedJob';

describe('RemovePluginFromMarketplaceDelayedJob', () => {
  const marketplaceDistributionId = createMarketplaceDistributionId(uuidv4());
  const marketplaceId = createMarketplaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const gitRepoId = createGitRepoId(uuidv4());
  const gitProviderId = createGitProviderId(uuidv4());

  const input: RemovePluginFromMarketplaceJobInput = {
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
    status: DistributionStatus.to_be_removed,
  });

  const marketplace = marketplaceFactory({
    id: marketplaceId,
    organizationId,
    gitRepoId,
    name: 'ACME Marketplace',
    descriptor: {
      vendor: 'anthropic',
      name: 'ACME Marketplace',
      plugins: [{ slug: 'security', name: 'Security' }],
      raw: { name: 'ACME Marketplace', plugins: [] },
    },
    pluginCount: 1,
  });

  const gitRepo: GitRepo = {
    id: gitRepoId,
    owner: 'acme',
    repo: 'plugins',
    branch: 'main',
    providerId: gitProviderId,
    type: 'marketplace',
  };

  const descriptor: MarketplaceDescriptor = {
    vendor: 'anthropic',
    name: 'ACME Marketplace',
    plugins: [{ slug: 'security', name: 'Security' }],
    raw: { name: 'ACME Marketplace', plugins: [{ slug: 'security' }] },
  };

  const successfulCommit: GitCommit = {
    sha: 'commit-sha-1',
  } as unknown as GitCommit;

  let mockMarketplaceDistributionRepository: jest.Mocked<IMarketplaceDistributionRepository>;
  let mockMarketplaceRepository: jest.Mocked<IMarketplaceRepository>;
  let mockGitRepoService: jest.Mocked<GitRepoService>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockParserRegistry: jest.Mocked<MarketplaceDescriptorParserRegistry>;
  let job: RemovePluginFromMarketplaceDelayedJob;

  beforeEach(() => {
    mockMarketplaceDistributionRepository = {
      findById: jest.fn().mockResolvedValue(distribution),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IMarketplaceDistributionRepository>;

    mockMarketplaceRepository = {
      findById: jest.fn().mockResolvedValue(marketplace),
    } as unknown as jest.Mocked<IMarketplaceRepository>;

    mockGitRepoService = {
      findMarketplaceGitRepoById: jest.fn().mockResolvedValue(gitRepo),
    } as unknown as jest.Mocked<GitRepoService>;

    mockGitPort = {
      commitToGit: jest.fn().mockResolvedValue(successfulCommit),
      getFileFromRepo: jest.fn().mockImplementation(async (_repo, path) => {
        if (path === 'packmind-lock.json') {
          return {
            sha: 'lock-sha',
            content: JSON.stringify({
              schemaVersion: 1,
              plugins: {
                security: {
                  version: '0.1.0',
                  contentHash: 'hash',
                  lastPublishedAt: '2026-06-01T10:00:00.000Z',
                  lastPublishedBy: userId,
                },
              },
            }),
          };
        }
        return { sha: 'sha-1', content: '{}' };
      }),
      createBranchFromBase: jest.fn().mockResolvedValue(undefined),
      openOrUpdatePullRequest: jest
        .fn()
        .mockResolvedValue({ url: 'https://pr', number: 1, wasCreated: true }),
    } as unknown as jest.Mocked<IGitPort>;

    mockParserRegistry = {
      parse: jest.fn().mockReturnValue(descriptor),
    } as unknown as jest.Mocked<MarketplaceDescriptorParserRegistry>;

    job = new RemovePluginFromMarketplaceDelayedJob(
      async () => ({}) as never,
      mockMarketplaceDistributionRepository,
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

  describe('on success', () => {
    beforeEach(async () => {
      await job.runJob('job-1', input, new AbortController());
    });

    it('ensures the rolling-PR branch exists', () => {
      expect(mockGitPort.createBranchFromBase).toHaveBeenCalledWith(
        gitRepo,
        MARKETPLACE_SYNC_BRANCH,
      );
    });

    it('reads the descriptor from the sync branch', () => {
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        gitRepo,
        expect.any(String),
        MARKETPLACE_SYNC_BRANCH,
      );
    });

    it('commits the updated descriptor to the rolling sync branch', () => {
      expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
        expect.objectContaining({ branch: MARKETPLACE_SYNC_BRANCH }),
        expect.arrayContaining([
          expect.objectContaining({ path: '.claude-plugin/marketplace.json' }),
        ]),
        MARKETPLACE_SYNC_PR_TITLE,
        expect.any(Array),
      );
    });

    it("deletes the plugin's directory as part of the commit", () => {
      const deleteFiles = mockGitPort.commitToGit.mock.calls[0][3];
      expect(deleteFiles).toEqual([
        { path: 'plugins/security', type: DeleteItemType.Directory },
      ]);
    });

    it('ensures the branch before pushing the commit', () => {
      const branchCallOrder =
        mockGitPort.createBranchFromBase.mock.invocationCallOrder[0];
      const commitCallOrder =
        mockGitPort.commitToGit.mock.invocationCallOrder[0];
      expect(branchCallOrder).toBeLessThan(commitCallOrder);
    });

    it('ensures the rolling Packmind sync PR after committing', () => {
      expect(mockGitPort.openOrUpdatePullRequest).toHaveBeenCalledWith(
        gitRepo,
        expect.objectContaining({ head: MARKETPLACE_SYNC_BRANCH }),
      );
    });

    it('leaves the distribution status untouched (reconciliation owns terminal removed)', () => {
      expect(
        mockMarketplaceDistributionRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when the plugin is already absent (NO_CHANGES_DETECTED)', () => {
    beforeEach(() => {
      mockGitPort.commitToGit = jest
        .fn()
        .mockRejectedValue(new Error('NO_CHANGES_DETECTED'));
    });

    it('treats it as a no-op and does not throw', async () => {
      await expect(
        job.runJob('job-1', input, new AbortController()),
      ).resolves.toBeUndefined();
    });
  });

  describe('when the git commit fails for another reason', () => {
    beforeEach(() => {
      mockGitPort.commitToGit = jest.fn().mockRejectedValue(new Error('boom'));
    });

    it('propagates the error so the job can be retried', async () => {
      await expect(
        job.runJob('job-1', input, new AbortController()),
      ).rejects.toThrow('boom');
    });
  });

  describe('when the marketplace git repo is missing', () => {
    beforeEach(() => {
      mockGitRepoService.findMarketplaceGitRepoById = jest
        .fn()
        .mockResolvedValue(null);
    });

    it('throws without attempting a commit', async () => {
      await expect(
        job.runJob('job-1', input, new AbortController()),
      ).rejects.toThrow(/git repo not found/i);
    });
  });
});
