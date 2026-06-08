import {
  DistributionStatus,
  GitProvider,
  IGitPort,
  Marketplace,
  MarketplaceDistribution,
  MarketplaceId,
  Package,
} from '@packmind/types';
import { gitProviderFactory } from '@packmind/git/test';
import {
  MarketplaceDistributionSchema,
  MarketplaceSchema,
} from '@packmind/deployments';
import { v4 as uuidv4 } from 'uuid';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

/**
 * Anthropic-shape descriptor seeded by the link path. Plugin slug
 * `plugin-alpha` is the one we will mark for removal, then reconcile.
 */
const INITIAL_DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [
    { name: 'plugin-alpha', version: '0.1.0' },
    { name: 'plugin-beta', version: '0.2.0' },
  ],
});

/**
 * Post-removal descriptor where the slug for `plugin-alpha` has been
 * deleted by the marketplace owner (their cleanup PR landed). The
 * reconciliation job should transition the `to_be_removed` row to
 * terminal `removed` and keep the marketplace `healthy`.
 */
const POST_REMOVAL_DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [{ name: 'plugin-beta', version: '0.2.0' }],
});

describe('Marketplace plugin removal: reconciliation success path', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplaceId: MarketplaceId;
  let pkg: Package;
  let distributionRow: MarketplaceDistribution;

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
      content: INITIAL_DESCRIPTOR_JSON,
    });

    // Stub the BullMQ-backed reconciliation job so the link path does
    // not try to reach a real queue. We invoke `runJob` directly later.
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

    // Step 1 — link the marketplace through the real use case so the
    // descriptor + state ('healthy') are persisted as in production.
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

    // Step 2 — create a real Packmind package so the cascade listener
    // can resolve a slug (used in the mark-for-removal event payload).
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

    // Step 3 — seed a `success`-state MarketplaceDistribution row for
    // (marketplace, package, 'plugin-alpha'). Inserting directly via
    // TypeORM keeps the test focused on the removal/reconciliation
    // pipeline (the render flow is exercised elsewhere).
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

    // Step 4 — admin marks the plugin for removal (manual trigger).
    await testApp.deploymentsHexa.getAdapter().markPluginForRemoval({
      ...dataFactory.packmindCommand(),
      marketplaceId,
      distributionId: distributionRow.id,
    });

    // Step 5 — descriptor now reflects the marketplace cleanup PR (the
    // slug has been dropped). Run the reconciliation job directly so
    // the cross-check transitions the row to `removed`.
    jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
      sha: 'mock-sha-2',
      content: POST_REMOVAL_DESCRIPTOR_JSON,
    });

    const reconciliationJob = adapterAny._linkMarketplaceUseCase
      .reconciliationJob as unknown as {
      runJob: (
        jobId: string,
        input: { marketplaceId: MarketplaceId },
        controller: AbortController,
      ) => Promise<unknown>;
    };
    await reconciliationJob.runJob(
      'manual-job-id',
      { marketplaceId },
      new AbortController(),
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('after the reconciliation sweep', () => {
    describe('the distribution row', () => {
      let reconciledRow: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distRepo = fixture.datasource.getRepository(
          MarketplaceDistributionSchema,
        );
        reconciledRow = (await distRepo.findOne({
          where: { id: distributionRow.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('transitions to terminal removed status', () => {
        expect(reconciledRow?.status).toBe(DistributionStatus.removed);
      });
    });

    describe('the marketplace state', () => {
      let reconciledMarketplace: Marketplace | null;
      let storedDescriptorDriftedSlugs: string[] | undefined;

      beforeEach(async () => {
        const marketplaceRepo =
          fixture.datasource.getRepository(MarketplaceSchema);
        reconciledMarketplace = (await marketplaceRepo.findOne({
          where: { id: marketplaceId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
        storedDescriptorDriftedSlugs =
          reconciledMarketplace?.descriptor?.driftedPluginSlugs;
      });

      // The reconciliation job picks `drift` whenever the on-disk
      // descriptor differs from what we last persisted, but the AC10
      // de-dup means the `to_be_removed` slug must NOT surface as a
      // drifted slug — it was an expected removal.
      it('omits the expected removal from driftedPluginSlugs', () => {
        expect(storedDescriptorDriftedSlugs).toBeUndefined();
      });
    });
  });
});
