import {
  DistributionStatus,
  GitProvider,
  IGitPort,
  MarketplaceDistribution,
  MarketplaceId,
  MarketplacePluginRemovalInitiatedEvent,
  MarketplacePluginRemovalInitiatedPayload,
  Package,
} from '@packmind/types';
import { gitProviderFactory } from '@packmind/git/test';
import { MarketplaceDistributionSchema } from '@packmind/deployments';
import {
  PackmindEventEmitterService,
  PackmindListener,
} from '@packmind/node-utils';
import { v4 as uuidv4 } from 'uuid';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import {
  prepareMarketplaceRemovalJob,
  runMarketplaceRemovalJob,
} from './helpers/marketplaceRemovalJob';
import { TestApp } from './helpers/TestApp';

type RemovalJobHandle = ReturnType<typeof prepareMarketplaceRemovalJob>;

const DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [{ name: 'plugin-alpha', version: '0.1.0' }],
});

interface StubRemovalAdapter {
  onMarketplacePluginRemovalInitiated(
    payload: MarketplacePluginRemovalInitiatedPayload,
  ): void;
}

class StubRemovalListener extends PackmindListener<StubRemovalAdapter> {
  protected registerHandlers(): void {
    this.subscribe(
      MarketplacePluginRemovalInitiatedEvent,
      this.handleRemovalInitiated,
    );
  }

  private handleRemovalInitiated = (
    event: MarketplacePluginRemovalInitiatedEvent,
  ): void => {
    this.adapter.onMarketplacePluginRemovalInitiated(event.payload);
  };
}

describe('Marketplace plugin removal: manual-trigger routes', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplaceId: MarketplaceId;
  let pkg: Package;
  let eventEmitterService: PackmindEventEmitterService;
  let stubAdapter: jest.Mocked<StubRemovalAdapter>;
  let removalJob: RemovalJobHandle;

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
    jest
      .spyOn(gitPort, 'getFileFromRepo')
      .mockImplementation(async (_repo, path) =>
        path === 'packmind-lock.json'
          ? null
          : { sha: 'mock-sha', content: DESCRIPTOR_JSON },
      );

    const deploymentsAdapter = testApp.deploymentsHexa.getAdapter();
    const adapterAny = deploymentsAdapter as unknown as {
      _linkMarketplaceUseCase: {
        reconciliationJob: {
          scheduleRecurring: () => Promise<void>;
          addJob: () => Promise<string>;
          cancelRecurring: () => Promise<void>;
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
      .mockResolvedValue('mock-job-id');
    jest
      .spyOn(
        adapterAny._linkMarketplaceUseCase.reconciliationJob,
        'cancelRecurring',
      )
      .mockResolvedValue(undefined);

    const linkResponse = await testApp.deploymentsHexa
      .getAdapter()
      .linkMarketplace({
        ...dataFactory.packmindCommand(),
        gitProviderId: gitProvider.id,
        owner: 'anthropic',
        repo: 'marketplace',
        branch: 'main',
        name: 'Anthropic Marketplace',
      });
    marketplaceId = linkResponse.id;

    const createPackageResponse = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...dataFactory.packmindCommand(),
        spaceId: dataFactory.space.id,
        name: 'Plugin Alpha Package',
        description: 'Backing package for the alpha plugin',
        recipeIds: [],
        standardIds: [],
      });
    pkg = createPackageResponse.package;

    // Stub listener subscribes BEFORE either manual route is invoked
    // so we capture every emitted event.
    eventEmitterService = testApp.registry.getService(
      PackmindEventEmitterService,
    );
    stubAdapter = {
      onMarketplacePluginRemovalInitiated: jest.fn(),
    };
    new StubRemovalListener(stubAdapter).initialize(eventEmitterService);

    // Since the removal-status refactor, `markPluginForRemoval` leaves the row
    // at `success` and enqueues the job that flips it to `to_be_removed` after
    // committing to the sync branch. Prepare the job so each scenario can drive
    // it inline after marking.
    removalJob = prepareMarketplaceRemovalJob(testApp, gitPort);
  });

  afterEach(async () => {
    eventEmitterService.removeAllListeners();
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('by-distributionId trigger', () => {
    let distributionRow: MarketplaceDistribution;

    beforeEach(async () => {
      const marketplaceDistributionRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      const inserted = await marketplaceDistributionRepo.save({
        id: uuidv4(),
        organizationId: dataFactory.organization.id,
        marketplaceId,
        packageId: pkg.id,
        pluginSlug: 'plugin-alpha',
        authorId: dataFactory.user.id,
        status: DistributionStatus.success,
        source: 'app',
      });
      distributionRow = inserted as unknown as MarketplaceDistribution;

      await testApp.deploymentsHexa.getAdapter().markPluginForRemoval({
        ...dataFactory.packmindCommand(),
        marketplaceId,
        distributionId: distributionRow.id,
      });

      // The status flip now happens in the removal job once the deletion
      // lands on the sync branch — drive it inline.
      await runMarketplaceRemovalJob(removalJob, {
        marketplaceDistributionId: distributionRow.id,
        marketplaceId,
        packageId: pkg.id,
        organizationId: dataFactory.organization.id,
        userId: dataFactory.user.id,
      });
    });

    describe('mutated distribution row', () => {
      let mutated: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distRepo = fixture.datasource.getRepository(
          MarketplaceDistributionSchema,
        );
        mutated = (await distRepo.findOne({
          where: { id: distributionRow.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('lands in to_be_removed', () => {
        expect(mutated?.status).toBe(DistributionStatus.to_be_removed);
      });
    });

    describe('the emitted event', () => {
      it('fires exactly once', () => {
        expect(
          stubAdapter.onMarketplacePluginRemovalInitiated,
        ).toHaveBeenCalledTimes(1);
      });

      describe('payload', () => {
        let payload: MarketplacePluginRemovalInitiatedPayload;

        beforeEach(() => {
          payload =
            stubAdapter.onMarketplacePluginRemovalInitiated.mock.calls[0][0];
        });

        it('carries trigger="from_marketplace"', () => {
          expect(payload.trigger).toBe('from_marketplace');
        });
      });
    });
  });

  describe('by-packageId trigger', () => {
    let distributionRow: MarketplaceDistribution;

    beforeEach(async () => {
      const marketplaceDistributionRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      const inserted = await marketplaceDistributionRepo.save({
        id: uuidv4(),
        organizationId: dataFactory.organization.id,
        marketplaceId,
        packageId: pkg.id,
        pluginSlug: 'plugin-alpha',
        authorId: dataFactory.user.id,
        status: DistributionStatus.success,
        source: 'app',
      });
      distributionRow = inserted as unknown as MarketplaceDistribution;

      // No `distributionId` — only `packageId`. The use case resolves
      // the latest successful (package, marketplace) distribution.
      await testApp.deploymentsHexa.getAdapter().markPluginForRemoval({
        ...dataFactory.packmindCommand(),
        marketplaceId,
        packageId: pkg.id,
      });

      // The status flip now happens in the removal job once the deletion
      // lands on the sync branch — drive it inline.
      await runMarketplaceRemovalJob(removalJob, {
        marketplaceDistributionId: distributionRow.id,
        marketplaceId,
        packageId: pkg.id,
        organizationId: dataFactory.organization.id,
        userId: dataFactory.user.id,
      });
    });

    describe('mutated distribution row', () => {
      let mutated: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distRepo = fixture.datasource.getRepository(
          MarketplaceDistributionSchema,
        );
        mutated = (await distRepo.findOne({
          where: { id: distributionRow.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('lands in to_be_removed', () => {
        expect(mutated?.status).toBe(DistributionStatus.to_be_removed);
      });
    });

    describe('the emitted event', () => {
      it('fires exactly once', () => {
        expect(
          stubAdapter.onMarketplacePluginRemovalInitiated,
        ).toHaveBeenCalledTimes(1);
      });

      describe('payload', () => {
        let payload: MarketplacePluginRemovalInitiatedPayload;

        beforeEach(() => {
          payload =
            stubAdapter.onMarketplacePluginRemovalInitiated.mock.calls[0][0];
        });

        it('carries trigger="from_marketplace"', () => {
          expect(payload.trigger).toBe('from_marketplace');
        });
      });
    });
  });
});
