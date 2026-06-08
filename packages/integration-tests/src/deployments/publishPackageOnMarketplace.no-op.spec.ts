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
  PluginPublishedEvent,
} from '@packmind/types';
import {
  PackmindEventEmitterService,
  PackmindListener,
} from '@packmind/node-utils';
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

/**
 * Capture every PluginPublishedEvent emitted during the test so we can
 * assert the wasNoop flag on the second republish without depending on
 * BullMQ event delivery internals.
 */
interface StubPublishedAdapter {
  onPluginPublished(event: PluginPublishedEvent): void;
}

class StubPublishedListener extends PackmindListener<StubPublishedAdapter> {
  protected registerHandlers(): void {
    this.subscribe(PluginPublishedEvent, this.handlePluginPublished);
  }

  private handlePluginPublished = (event: PluginPublishedEvent): void => {
    this.adapter.onPluginPublished(event);
  };
}

describe('publishPackageOnMarketplace — no-op idempotency', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplace: LinkMarketplaceResponse;
  let pkg: Package;
  let commitToGitSpy: jest.SpyInstance;
  let eventEmitterService: PackmindEventEmitterService;
  let stubPublishedAdapter: jest.Mocked<StubPublishedAdapter>;
  let stubPublishedListener: StubPublishedListener;

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

    // Descriptor served on the marketplace repo. The standalone
    // packmind-lock.json is reported missing so the first publish
    // exercises the empty-lock first-publish path.
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

    // Simulate the git side effect for the no-op scenario: first publish
    // commits successfully; the second publish hits `NO_CHANGES_DETECTED`
    // because the rendered content is byte-identical to what is already on
    // the rolling sync branch. This mirrors the production code path —
    // `commitToGit` is what surfaces the no-op signal to the job.
    commitToGitSpy = jest
      .spyOn(gitPort, 'commitToGit')
      .mockImplementation(async () => {
        if (commitToGitSpy.mock.calls.length === 1) {
          return {
            sha: 'commit-sha-1',
          } as GitCommit;
        }
        throw new Error('NO_CHANGES_DETECTED');
      });
    jest.spyOn(gitPort, 'createBranchFromBase').mockResolvedValue(undefined);
    jest.spyOn(gitPort, 'openOrUpdatePullRequest').mockResolvedValue({
      url: 'https://github.com/anthropic/marketplace/pull/9',
      number: 9,
      wasCreated: true,
    });

    // The rolling sync branch presence has no impact on this no-op scenario
    // — the descriptor mock returns the same content on any branch. Default
    // to "absent" so both publishes read from the marketplace default
    // branch.
    jest.spyOn(gitPort, 'checkBranchExists').mockResolvedValue(false);

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

    eventEmitterService = testApp.registry.getService(
      PackmindEventEmitterService,
    );
    stubPublishedAdapter = {
      onPluginPublished: jest.fn(),
    };
    stubPublishedListener = new StubPublishedListener(stubPublishedAdapter);
    stubPublishedListener.initialize(eventEmitterService);
  });

  afterEach(async () => {
    eventEmitterService.removeAllListeners();
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('when the same package is republished without content changes', () => {
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
      // No content change between the two publishes — second one must
      // short-circuit on the content hash.
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

    it('records status=success on the first distribution row', () => {
      expect(firstRow?.status).toBe(DistributionStatus.success);
    });

    it('records status=no_changes on the second distribution row', () => {
      expect(secondRow?.status).toBe(DistributionStatus.no_changes);
    });

    it('persists a single successful commit (the second call surfaces NO_CHANGES_DETECTED and lands nothing)', () => {
      expect(firstRow?.gitCommit).toBe('commit-sha-1');
    });

    it('does not record a gitCommit on the no-op row', () => {
      expect(secondRow?.gitCommit).toBeFalsy();
    });

    it('preserves the content hash across both rows', () => {
      expect(secondRow?.contentHash).toBe(firstRow?.contentHash);
    });

    describe('the descriptor committed by the first publish', () => {
      let pluginEntry: {
        slug?: string;
        source?: { source?: string; url?: string; path?: string };
      };

      beforeEach(() => {
        const committedFiles = commitToGitSpy.mock.calls[0][1] as Array<{
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

      it('attaches a git-subdir source block on the plugin entry', () => {
        expect(pluginEntry.source).toEqual({
          source: 'git-subdir',
          url: 'https://github.com/anthropic/marketplace.git',
          path: 'plugins/security',
        });
      });
    });

    describe('PluginPublishedEvent for the no-op publish', () => {
      let noopEvent: PluginPublishedEvent | undefined;

      beforeEach(() => {
        const calls = stubPublishedAdapter.onPluginPublished.mock.calls.map(
          (call) => call[0],
        );
        noopEvent = calls.find(
          (event) =>
            event.payload.marketplaceDistributionId ===
            secondResponse.marketplaceDistributionId,
        );
      });

      it('emits a PluginPublishedEvent for the second publish', () => {
        expect(noopEvent).toBeDefined();
      });

      it('flags the no-op event with wasNoop=true', () => {
        expect(noopEvent?.payload.wasNoop).toBe(true);
      });
    });
  });
});
