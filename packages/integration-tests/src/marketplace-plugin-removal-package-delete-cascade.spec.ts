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
import { TestApp } from './helpers/TestApp';

const ANTHROPIC_DESCRIPTOR_JSON_A = JSON.stringify({
  name: 'Marketplace A',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [{ name: 'plugin-alpha', version: '0.1.0' }],
});

const ANTHROPIC_DESCRIPTOR_JSON_B = JSON.stringify({
  name: 'Marketplace B',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [{ name: 'plugin-alpha', version: '0.1.0' }],
});

interface StubRemovalAdapter {
  onMarketplacePluginRemovalInitiated(
    payload: MarketplacePluginRemovalInitiatedPayload,
  ): void;
}

/**
 * Polls `predicate` until it returns true or the timeout elapses.
 *
 * The package-delete cascade is dispatched fire-and-forget: the use case emits
 * `PackagesDeletedEvent` via a synchronous event emit whose async handler then
 * settles on its own microtask chain. A deterministic test must therefore wait
 * on the observable outcome, not a guessed sleep duration.
 */
async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  {
    timeoutMs = 2000,
    intervalMs = 10,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
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

describe('Marketplace plugin removal: package-delete cascade', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplaceAId: MarketplaceId;
  let marketplaceBId: MarketplaceId;
  let pkg: Package;
  let distributionRowA: MarketplaceDistribution;
  let distributionRowB: MarketplaceDistribution;
  let eventEmitterService: PackmindEventEmitterService;
  let stubAdapter: jest.Mocked<StubRemovalAdapter>;
  let stubListener: StubRemovalListener;

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

    // Both link calls hit the same stub, so we mock per-call to seed
    // both marketplaces with distinct descriptors.
    jest
      .spyOn(gitPort, 'getFileFromRepo')
      .mockResolvedValueOnce({
        sha: 'mock-sha-a',
        content: ANTHROPIC_DESCRIPTOR_JSON_A,
      })
      .mockResolvedValueOnce({
        sha: 'mock-sha-b',
        content: ANTHROPIC_DESCRIPTOR_JSON_B,
      });

    const deploymentsAdapter = testApp.deploymentsHexa.getAdapter();
    const adapterAny = deploymentsAdapter as unknown as {
      _linkMarketplaceUseCase: {
        reconciliationJob: {
          scheduleRecurring: () => Promise<void>;
          addJob: () => Promise<string>;
          cancelRecurring: () => Promise<void>;
        };
      };
      getRemovePluginFromMarketplaceJob: () => {
        addJob: () => Promise<string>;
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

    // Stub the Git side-effect job the cascade enqueues per flipped
    // distribution. Under the integration-test harness `addJob` runs the job
    // inline (SyncJob), which would fire real, unmocked git operations
    // mid-cascade — slow, non-deterministic, and prone to leaking past
    // teardown. This test only asserts the DB transition + event emission, so
    // stub it to a no-op (mirrors the reconciliation-job stub above).
    jest
      .spyOn(adapterAny.getRemovePluginFromMarketplaceJob(), 'addJob')
      .mockResolvedValue('mock-removal-job-id');

    const linkA = await testApp.deploymentsHexa.getAdapter().linkMarketplace({
      ...dataFactory.packmindCommand(),
      gitProviderId: gitProvider.id,
      owner: 'anthropic',
      repo: 'marketplace-a',
      branch: 'main',
      name: 'Marketplace A',
    });
    marketplaceAId = linkA.id;

    const linkB = await testApp.deploymentsHexa.getAdapter().linkMarketplace({
      ...dataFactory.packmindCommand(),
      gitProviderId: gitProvider.id,
      owner: 'anthropic',
      repo: 'marketplace-b',
      branch: 'main',
      name: 'Marketplace B',
    });
    marketplaceBId = linkB.id;

    const createPackageResponse = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...dataFactory.packmindCommand(),
        spaceId: dataFactory.space.id,
        name: 'Plugin Alpha Package',
        description: 'Backing package published to two marketplaces',
        recipeIds: [],
        standardIds: [],
      });
    pkg = createPackageResponse.package;

    // Seed `success` distributions in both marketplaces — the cascade
    // listener must flip BOTH to `to_be_removed` and emit one event
    // per affected distribution.
    const marketplaceDistributionRepo = fixture.datasource.getRepository(
      MarketplaceDistributionSchema,
    );
    const insertedA = await marketplaceDistributionRepo.save({
      id: uuidv4(),
      organizationId: dataFactory.organization.id,
      marketplaceId: marketplaceAId,
      packageId: pkg.id,
      pluginSlug: 'plugin-alpha',
      authorId: dataFactory.user.id,
      status: DistributionStatus.success,
      source: 'app',
    });
    const insertedB = await marketplaceDistributionRepo.save({
      id: uuidv4(),
      organizationId: dataFactory.organization.id,
      marketplaceId: marketplaceBId,
      packageId: pkg.id,
      pluginSlug: 'plugin-alpha',
      authorId: dataFactory.user.id,
      status: DistributionStatus.success,
      source: 'app',
    });
    distributionRowA = insertedA as unknown as MarketplaceDistribution;
    distributionRowB = insertedB as unknown as MarketplaceDistribution;

    // Subscribe a stub listener AFTER the link path so we don't pick
    // up unrelated events from the link flow.
    eventEmitterService = testApp.registry.getService(
      PackmindEventEmitterService,
    );
    stubAdapter = {
      onMarketplacePluginRemovalInitiated: jest.fn(),
    };
    stubListener = new StubRemovalListener(stubAdapter);
    stubListener.initialize(eventEmitterService);

    // Trigger the cascade via the public delete-batch use case.
    await testApp.deploymentsHexa.getAdapter().deletePackagesBatch({
      ...dataFactory.packmindCommand(),
      spaceId: dataFactory.space.id,
      packageIds: [pkg.id],
    });

    // Wait for the fire-and-forget cascade to settle on its observable
    // outcome — both seeded distributions flipped to `to_be_removed` and one
    // removal event emitted per distribution — rather than guessing a sleep
    // duration. The iteration order of the two distributions is not
    // deterministic, so a fixed sleep would race whichever row settles last.
    const cascadeDistRepo = fixture.datasource.getRepository(
      MarketplaceDistributionSchema,
    );
    await waitFor(async () => {
      const [rowA, rowB] = await Promise.all([
        cascadeDistRepo.findOne({ where: { id: distributionRowA.id } }),
        cascadeDistRepo.findOne({ where: { id: distributionRowB.id } }),
      ]);
      return (
        rowA?.status === DistributionStatus.to_be_removed &&
        rowB?.status === DistributionStatus.to_be_removed &&
        stubAdapter.onMarketplacePluginRemovalInitiated.mock.calls.length === 2
      );
    });
  });

  afterEach(async () => {
    eventEmitterService.removeAllListeners();
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('after the package-delete cascade', () => {
    describe('distribution row A', () => {
      let cascadedRow: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distRepo = fixture.datasource.getRepository(
          MarketplaceDistributionSchema,
        );
        cascadedRow = (await distRepo.findOne({
          where: { id: distributionRowA.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('transitions to to_be_removed', () => {
        expect(cascadedRow?.status).toBe(DistributionStatus.to_be_removed);
      });
    });

    describe('distribution row B', () => {
      let cascadedRow: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distRepo = fixture.datasource.getRepository(
          MarketplaceDistributionSchema,
        );
        cascadedRow = (await distRepo.findOne({
          where: { id: distributionRowB.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('transitions to to_be_removed', () => {
        expect(cascadedRow?.status).toBe(DistributionStatus.to_be_removed);
      });
    });

    describe('MarketplacePluginRemovalInitiatedEvent emissions', () => {
      it('fires exactly twice — one per affected distribution', () => {
        expect(
          stubAdapter.onMarketplacePluginRemovalInitiated,
        ).toHaveBeenCalledTimes(2);
      });

      describe('every emitted payload', () => {
        let payloads: MarketplacePluginRemovalInitiatedPayload[];

        beforeEach(() => {
          payloads =
            stubAdapter.onMarketplacePluginRemovalInitiated.mock.calls.map(
              ([payload]) => payload,
            );
        });

        it('carries trigger="from_packmind_package" on every emission', () => {
          expect(
            payloads.every((p) => p.trigger === 'from_packmind_package'),
          ).toBe(true);
        });
      });
    });
  });
});
