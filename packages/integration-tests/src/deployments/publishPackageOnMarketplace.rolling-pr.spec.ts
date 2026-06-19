import { MarketplaceDistributionSchema } from '@packmind/deployments';
import { gitProviderFactory } from '@packmind/git/test';
import {
  DistributionStatus,
  GitCommit,
  GitProvider,
  IGitPort,
  LinkMarketplaceResponse,
  MarketplaceDistribution,
  Package,
} from '@packmind/types';
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { DataFactory } from '../helpers/DataFactory';
import { integrationTestSchemas } from '../helpers/makeIntegrationTestDataSource';
import { runMarketplaceReconciliation } from '../helpers/marketplaceReconciliation';
import { TestApp } from '../helpers/TestApp';

const ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [],
});

const ROLLING_PR_URL = 'https://github.com/anthropic/marketplace/pull/7';

describe('publishPackageOnMarketplace — rolling PR amend', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplace: LinkMarketplaceResponse;
  let pkg: Package;
  let commitToGitSpy: jest.SpyInstance;
  let openOrUpdatePullRequestSpy: jest.SpyInstance;
  let checkBranchExistsSpy: jest.SpyInstance;
  let getFileFromRepoSpy: jest.SpyInstance;
  /**
   * Tracks the descriptor content "on disk" so the second publish reads the
   * accumulated state from the rolling sync branch, mirroring how a real Git
   * host serves the latest commit on that branch.
   */
  let currentDescriptorContent: string;
  /**
   * Tracks the standalone packmind-lock.json content "on disk" so each
   * subsequent publish sees the previous publish's lock entries. Starts as
   * `null` so the first publish exercises the empty-lock first-publish path.
   */
  let currentLockContent: string | null;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization({ email: 'admin@example.com' });

    ({ gitProvider } = await dataFactory.withGitProvider(
      gitProviderFactory({ token: 'gh-pat-test-token' }),
    ));

    gitPort = testApp.gitHexa.getAdapter();

    currentDescriptorContent = ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON;
    currentLockContent = null;

    // Serve descriptor + lock from the in-memory "repo" state so the second
    // publish sees the first publish's accumulated entries, matching how the
    // upstream Git host returns the latest commit on the rolling sync
    // branch.
    getFileFromRepoSpy = jest
      .spyOn(gitPort, 'getFileFromRepo')
      .mockImplementation(async (_repo, path) => {
        if (path === 'packmind-lock.json') {
          return currentLockContent === null
            ? null
            : { sha: 'mock-lock-sha', content: currentLockContent };
        }
        return {
          sha: 'mock-sha',
          content: currentDescriptorContent,
        };
      });

    // First publish: rolling sync branch doesn't exist yet; second publish:
    // first publish created it so the resolver returns the rolling branch.
    // The flag flips after the first commit lands on `packmind/sync`.
    let rollingBranchExists = false;
    checkBranchExistsSpy = jest
      .spyOn(gitPort, 'checkBranchExists')
      .mockImplementation(async (_providerId, _owner, _repo, branch) => {
        if (branch === 'packmind/sync') {
          return rollingBranchExists;
        }
        return false;
      });

    // Stub the reconciliation job so a successful link does not try to
    // contact a real queue (link-time concern only).
    const deploymentsAdapter = testApp.deploymentsHexa.getAdapter();
    const adapterAny = deploymentsAdapter as unknown as {
      _linkMarketplaceUseCase: {
        reconciliationJob: {
          scheduleRecurring: () => Promise<void>;
          addJob: () => Promise<string>;
        };
      };
    };
    jest
      .spyOn(
        adapterAny._linkMarketplaceUseCase.reconciliationJob,
        'scheduleRecurring',
      )
      .mockResolvedValue(undefined);
    jest
      .spyOn(adapterAny._linkMarketplaceUseCase.reconciliationJob, 'addJob')
      .mockResolvedValue('mock-reconciliation-job-id');

    // Git side effects executed by the publish job — captured rather than
    // performed. The in-memory descriptor + lock are updated so the next
    // publish reads the accumulated state, and the rolling-branch flag is
    // flipped on so `checkBranchExists` reports it as present from then on.
    commitToGitSpy = jest
      .spyOn(gitPort, 'commitToGit')
      .mockImplementation(async (_repo, files) => {
        for (const file of files as Array<{ path: string; content: string }>) {
          if (file.path === '.claude-plugin/marketplace.json') {
            currentDescriptorContent = file.content;
          } else if (file.path === 'packmind-lock.json') {
            currentLockContent = file.content;
          }
        }
        rollingBranchExists = true;
        return {
          sha: `commit-sha-${commitToGitSpy.mock.calls.length}`,
        } as GitCommit;
      });
    jest.spyOn(gitPort, 'createBranchFromBase').mockResolvedValue(undefined);
    // First call returns wasCreated=true; subsequent calls match GitHub's
    // semantics for an already-open PR on the same head/base.
    openOrUpdatePullRequestSpy = jest
      .spyOn(gitPort, 'openOrUpdatePullRequest')
      .mockImplementation(async () => ({
        url: ROLLING_PR_URL,
        number: 7,
        wasCreated: openOrUpdatePullRequestSpy.mock.calls.length === 1,
      }));

    // Seed: link a marketplace through the real flow so all DB rows are
    // populated consistently.
    marketplace = await testApp.deploymentsHexa.getAdapter().linkMarketplace({
      ...dataFactory.packmindCommand(),
      gitProviderId: gitProvider.id,
      owner: 'anthropic',
      repo: 'marketplace',
      branch: 'main',
      name: 'Anthropic Marketplace',
    });

    // Seed: a recipe + a package containing it so the renderer has content
    // to commit on the first publish.
    const recipe = await dataFactory.withRecipe({ name: 'Hello recipe' });
    const createPackageResponse = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...dataFactory.packmindCommand(),
        spaceId: dataFactory.space.id,
        name: 'Security',
        description: 'Security curated package',
        recipeIds: [recipe.id],
        standardIds: [],
      });
    pkg = createPackageResponse.package;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when the same package is published twice with content changes between', () => {
    let firstResponse: Awaited<
      ReturnType<
        ReturnType<
          typeof testApp.deploymentsHexa.getAdapter
        >['publishPackageOnMarketplace']
      >
    >;
    let secondResponse: Awaited<
      ReturnType<
        ReturnType<
          typeof testApp.deploymentsHexa.getAdapter
        >['publishPackageOnMarketplace']
      >
    >;
    let firstRow: MarketplaceDistribution | null;
    let secondRow: MarketplaceDistribution | null;

    beforeEach(async () => {
      const adapter = testApp.deploymentsHexa.getAdapter();
      firstResponse = await adapter.publishPackageOnMarketplace({
        ...dataFactory.packmindCommand(),
        marketplaceId: marketplace.id,
        packageId: pkg.id,
      });

      // Add a second artifact to the package so the rendered plugin content
      // differs from the first publish — otherwise the content-hash gate
      // short-circuits the second publish to `no_changes`.
      const newStandard = await dataFactory.withStandard({
        name: 'Extra standard',
      });
      await adapter.addArtefactsToPackage({
        ...dataFactory.packmindCommand(),
        spaceId: dataFactory.space.id,
        packageId: pkg.id,
        standardIds: [newStandard.id],
      });

      secondResponse = await adapter.publishPackageOnMarketplace({
        ...dataFactory.packmindCommand(),
        marketplaceId: marketplace.id,
        packageId: pkg.id,
      });

      // Both publishes land in `pending_merge`; drive a reconciliation so the
      // rows are confirmed to `success` once their lock entries are present on
      // the default branch — the in-memory lock now holds both publishes.
      await runMarketplaceReconciliation(testApp, marketplace.id);

      const distributionRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      firstRow = (await distributionRepo.findOne({
        where: { id: firstResponse.marketplaceDistributionId },
      })) as MarketplaceDistribution | null;
      secondRow = (await distributionRepo.findOne({
        where: { id: secondResponse.marketplaceDistributionId },
      })) as MarketplaceDistribution | null;
    });

    it('lands two commits on the rolling sync branch', () => {
      expect(commitToGitSpy).toHaveBeenCalledTimes(2);
    });

    it('targets the same rolling sync branch on every commit', () => {
      const branches = commitToGitSpy.mock.calls.map(
        (call) => (call[0] as { branch: string }).branch,
      );
      expect(branches).toEqual(['packmind/sync', 'packmind/sync']);
    });

    it('opens (or amends) the rolling PR with the canonical title', () => {
      const titles = openOrUpdatePullRequestSpy.mock.calls.map(
        (call) => (call[1] as { title: string }).title,
      );
      expect(titles).toEqual(['Packmind sync', 'Packmind sync']);
    });

    it('opens (or amends) the rolling PR on the canonical sync branch', () => {
      const heads = openOrUpdatePullRequestSpy.mock.calls.map(
        (call) => (call[1] as { head: string }).head,
      );
      expect(heads).toEqual(['packmind/sync', 'packmind/sync']);
    });

    it('creates the PR on the first publish and amends it on the second', async () => {
      const results = await Promise.all(
        openOrUpdatePullRequestSpy.mock.results.map(
          (result) => result.value as Promise<{ wasCreated: boolean }>,
        ),
      );
      const wasCreatedFlags = results.map((r) => r.wasCreated);
      expect(wasCreatedFlags).toEqual([true, false]);
    });

    it('records status=success on the first distribution row', () => {
      expect(firstRow?.status).toBe(DistributionStatus.success);
    });

    it('records status=success on the second distribution row', () => {
      expect(secondRow?.status).toBe(DistributionStatus.success);
    });

    it('stores the same rolling PR URL on the first distribution row', () => {
      expect(firstRow?.prUrl).toBe(ROLLING_PR_URL);
    });

    it('stores the same rolling PR URL on the second distribution row', () => {
      expect(secondRow?.prUrl).toBe(ROLLING_PR_URL);
    });

    describe('the source block on the committed descriptor', () => {
      let firstPluginEntry: {
        slug?: string;
        source?: { source?: string; url?: string; path?: string };
      };
      let secondPluginEntry: {
        slug?: string;
        source?: { source?: string; url?: string; path?: string };
      };

      beforeEach(() => {
        const firstCallFiles = commitToGitSpy.mock.calls[0][1] as Array<{
          path: string;
          content: string;
        }>;
        const secondCallFiles = commitToGitSpy.mock.calls[1][1] as Array<{
          path: string;
          content: string;
        }>;
        const firstDescriptorFile = firstCallFiles.find(
          (f) => f.path === '.claude-plugin/marketplace.json',
        );
        const secondDescriptorFile = secondCallFiles.find(
          (f) => f.path === '.claude-plugin/marketplace.json',
        );
        const firstParsed = JSON.parse(
          firstDescriptorFile?.content ?? '{}',
        ) as {
          plugins: Array<typeof firstPluginEntry>;
        };
        const secondParsed = JSON.parse(
          secondDescriptorFile?.content ?? '{}',
        ) as {
          plugins: Array<typeof secondPluginEntry>;
        };
        firstPluginEntry =
          firstParsed.plugins.find((p) => p.slug === 'security') ?? {};
        secondPluginEntry =
          secondParsed.plugins.find((p) => p.slug === 'security') ?? {};
      });

      it('writes a git-subdir source on the first publish entry', () => {
        expect(firstPluginEntry.source).toEqual({
          source: 'git-subdir',
          url: 'https://github.com/anthropic/marketplace.git',
          path: 'plugins/security',
        });
      });

      it('writes a git-subdir source on the second publish entry', () => {
        expect(secondPluginEntry.source).toEqual({
          source: 'git-subdir',
          url: 'https://github.com/anthropic/marketplace.git',
          path: 'plugins/security',
        });
      });
    });

    describe('branch resolution', () => {
      it('probes the rolling sync branch presence on both publishes', () => {
        const probedBranches = checkBranchExistsSpy.mock.calls.map(
          (call) => call[3] as string,
        );
        expect(probedBranches.every((b) => b === 'packmind/sync')).toBe(true);
      });

      it('reads the descriptor + lock from the rolling sync branch after the first publish has landed', () => {
        const branchesUsedToFetchAfterFirstCommit =
          getFileFromRepoSpy.mock.calls
            .filter(
              (call) =>
                call[1] === '.claude-plugin/marketplace.json' ||
                call[1] === 'packmind-lock.json',
            )
            .map((call) => call[2] as string);
        expect(branchesUsedToFetchAfterFirstCommit).toContain('packmind/sync');
      });
    });
  });
});
