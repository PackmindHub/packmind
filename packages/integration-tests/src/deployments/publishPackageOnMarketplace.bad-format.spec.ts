import {
  MarketplaceDistributionSchema,
  MarketplaceSchema,
} from '@packmind/deployments';
import { gitProviderFactory } from '@packmind/git/test';
import {
  DistributionStatus,
  GitProvider,
  IGitPort,
  LinkMarketplaceResponse,
  Marketplace,
  MarketplaceDescriptorNotFoundError,
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

describe('publishPackageOnMarketplace — descriptor missing maps to bad_format', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplace: LinkMarketplaceResponse;
  let pkg: Package;
  let getFileFromRepoSpy: jest.SpyInstance;
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

    // Serve a valid descriptor during link-time, then flip the stub to
    // return null inside the publish test so the descriptor is missing only
    // at publish time. The standalone packmind-lock.json is reported
    // missing so first-publish wiring stays consistent.
    getFileFromRepoSpy = jest
      .spyOn(gitPort, 'getFileFromRepo')
      .mockImplementation(async (_repo, path) => {
        if (path === 'packmind-lock.json') {
          return null;
        }
        return {
          sha: 'mock-sha',
          content: ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON,
        };
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

    // Flip the descriptor probe to "not found" so the publish use case
    // surfaces the missing-descriptor failure.
    getFileFromRepoSpy.mockResolvedValue(null);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when the marketplace descriptor is missing at publish time', () => {
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

    it('throws MarketplaceDescriptorNotFoundError synchronously', () => {
      expect(thrown).toBeInstanceOf(MarketplaceDescriptorNotFoundError);
    });

    it('flips the marketplace state to bad_format', async () => {
      const marketplaceRepo =
        fixture.datasource.getRepository(MarketplaceSchema);
      const persisted = (await marketplaceRepo.findOne({
        where: { id: marketplace.id },
      })) as Marketplace | null;
      expect(persisted?.state).toBe('bad_format');
    });

    it('does not push any commit on the marketplace repo', () => {
      expect(commitToGitSpy).not.toHaveBeenCalled();
    });

    it('does not open or amend a pull request on the marketplace repo', () => {
      expect(openOrUpdatePullRequestSpy).not.toHaveBeenCalled();
    });

    it('does not persist any distribution row in success state', async () => {
      const distributionRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      const successRows = (await distributionRepo.find({
        where: {
          marketplaceId: marketplace.id,
          status: DistributionStatus.success,
        },
      })) as MarketplaceDistribution[];
      expect(successRows).toHaveLength(0);
    });
  });
});
