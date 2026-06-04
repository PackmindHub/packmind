import { MarketplaceDistributionSchema } from '@packmind/deployments';
import { gitProviderFactory } from '@packmind/git/test';
import {
  GitProvider,
  IGitPort,
  LinkMarketplaceResponse,
  MarketplaceDistribution,
  MarketplacePluginNameConflictError,
  Package,
} from '@packmind/types';
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { DataFactory } from '../helpers/DataFactory';
import { integrationTestSchemas } from '../helpers/makeIntegrationTestDataSource';
import { TestApp } from '../helpers/TestApp';

/**
 * Marketplace descriptor that already exposes an unmanaged plugin named
 * "Security" (slug `security`). Publishing a Packmind package whose slug
 * also collapses to `security` must fail with a name-conflict error.
 */
const COLLIDING_MARKETPLACE_DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [{ name: 'Security' }],
});

describe('publishPackageOnMarketplace — name collision with unmanaged plugin', () => {
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

    jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
      sha: 'mock-sha',
      content: COLLIDING_MARKETPLACE_DESCRIPTOR_JSON,
    });

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

    commitToGitSpy = jest.spyOn(gitPort, 'commitToGit');
    openOrUpdatePullRequestSpy = jest.spyOn(gitPort, 'openOrUpdatePullRequest');
    jest.spyOn(gitPort, 'createBranchFromBase').mockResolvedValue(undefined);

    marketplace = await testApp.deploymentsHexa.getAdapter().linkMarketplace({
      ...dataFactory.packmindCommand(),
      gitProviderId: gitProvider.id,
      owner: 'anthropic',
      repo: 'marketplace',
      branch: 'main',
      name: 'Anthropic Marketplace',
    });

    // Tiny package — no artifacts needed since the collision check fires
    // before rendering. Slug derives from name → 'security' which collides
    // with the unmanaged "Security" plugin already in the descriptor.
    const createPackageResponse = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...dataFactory.packmindCommand(),
        spaceId: dataFactory.space.id,
        name: 'Security',
        description: 'Security curated package',
        recipeIds: [],
        standardIds: [],
      });
    pkg = createPackageResponse.package;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when the package slug collides with an unmanaged plugin entry', () => {
    let thrown: unknown;

    beforeEach(async () => {
      try {
        await testApp.deploymentsHexa.getAdapter().publishPackageOnMarketplace({
          ...dataFactory.packmindCommand(),
          marketplaceId: marketplace.id,
          packageId: pkg.id,
        });
      } catch (error) {
        thrown = error;
      }
    });

    it('throws MarketplacePluginNameConflictError synchronously', () => {
      expect(thrown).toBeInstanceOf(MarketplacePluginNameConflictError);
    });

    it('mentions the conflicting plugin slug in the error message', () => {
      expect((thrown as Error).message).toContain('security');
    });

    it('does not push any commit on the marketplace repo', () => {
      expect(commitToGitSpy).not.toHaveBeenCalled();
    });

    it('does not open a pull request on the marketplace repo', () => {
      expect(openOrUpdatePullRequestSpy).not.toHaveBeenCalled();
    });

    it('does not persist any MarketplaceDistribution row for the package', async () => {
      const distributionRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      const rows = (await distributionRepo.find({
        where: { marketplaceId: marketplace.id, packageId: pkg.id },
      })) as MarketplaceDistribution[];
      expect(rows).toHaveLength(0);
    });
  });
});
