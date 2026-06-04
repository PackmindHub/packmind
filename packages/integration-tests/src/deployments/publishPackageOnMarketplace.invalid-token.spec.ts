import { MarketplaceDistributionSchema } from '@packmind/deployments';
import { gitProviderFactory } from '@packmind/git/test';
import {
  GitProvider,
  GitProviderTokenInvalidError,
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

describe('publishPackageOnMarketplace — expired token preflight', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplace: LinkMarketplaceResponse;
  let pkg: Package;
  let publishJobAddSpy: jest.SpyInstance;
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

    // Serve a valid descriptor at link time so the linkMarketplace flow can
    // succeed and seed the marketplace + git repo rows. The standalone
    // packmind-lock.json is absent — irrelevant here because the publish
    // never reaches the lock fetch (token preflight fails first), but
    // keeping the mock realistic.
    jest
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
      _publishPackageOnMarketplaceUseCase: {
        publishJob: {
          addJob: (...args: unknown[]) => Promise<string>;
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

    publishJobAddSpy = jest.spyOn(
      adapterAny._publishPackageOnMarketplaceUseCase.publishJob,
      'addJob',
    );

    // Simulate an expired / invalid token: the preflight listProviders call
    // returns a provider whose `hasAuth` flag is false. The use case must
    // treat this as a synchronous failure before persisting any row or
    // enqueuing the BullMQ job.
    jest.spyOn(gitPort, 'listProviders').mockResolvedValue({
      providers: [
        {
          id: gitProvider.id,
          source: gitProvider.source,
          organizationId: gitProvider.organizationId,
          url: gitProvider.url,
          hasAuth: false,
          authMethod: 'token',
        },
      ],
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when the marketplace git provider has no usable token', () => {
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

    it('throws GitProviderTokenInvalidError synchronously', () => {
      expect(thrown).toBeInstanceOf(GitProviderTokenInvalidError);
    });

    it('exposes the verbatim user-facing message on the error', () => {
      expect((thrown as Error).message).toBe(
        GitProviderTokenInvalidError.USER_FACING_MESSAGE,
      );
    });

    it('never echoes the token in the error message', () => {
      expect((thrown as Error).message).not.toContain('gh-pat-test-token');
    });

    it('does not create any MarketplaceDistribution row', async () => {
      const distributionRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      const rows = (await distributionRepo.find({
        where: { marketplaceId: marketplace.id },
      })) as MarketplaceDistribution[];
      expect(rows).toHaveLength(0);
    });

    it('does not enqueue the publish BullMQ job', () => {
      expect(publishJobAddSpy).not.toHaveBeenCalled();
    });

    it('does not push any commit on the marketplace repo', () => {
      expect(commitToGitSpy).not.toHaveBeenCalled();
    });

    it('does not open a pull request on the marketplace repo', () => {
      expect(openOrUpdatePullRequestSpy).not.toHaveBeenCalled();
    });
  });
});
