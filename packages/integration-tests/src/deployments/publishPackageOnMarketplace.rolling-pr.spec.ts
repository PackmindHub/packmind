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

    // Descriptor served on the marketplace repo. Returned for both link
    // probes and subsequent re-fetches in the publish job.
    jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
      sha: 'mock-sha',
      content: ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON,
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
    // performed.
    commitToGitSpy = jest
      .spyOn(gitPort, 'commitToGit')
      .mockImplementation(async () => {
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
  });
});
