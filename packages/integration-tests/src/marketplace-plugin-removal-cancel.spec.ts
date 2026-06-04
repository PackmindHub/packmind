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

const DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [
    { name: 'plugin-alpha', version: '0.1.0' },
    { name: 'plugin-beta', version: '0.2.0' },
  ],
});

describe('Marketplace plugin removal: cancellation reverts state', () => {
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
      content: DESCRIPTOR_JSON,
    });

    const deploymentsAdapter = testApp.deploymentsHexa.getAdapter();
    const adapterAny = deploymentsAdapter as unknown as {
      _linkMarketplaceUseCase: {
        reconciliationJob: {
          scheduleRecurring: () => Promise<void>;
          addJob: () => Promise<string>;
          cancelRecurring: () => Promise<void>;
          runJob: (
            jobId: string,
            input: { marketplaceId: MarketplaceId },
            controller: AbortController,
          ) => Promise<unknown>;
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

    // Mark the plugin for removal, then immediately cancel it. The
    // distribution row should be reverted back to `success` with no
    // `MarketplacePluginRemovalInitiatedEvent` cleanup needed (cancel
    // does not emit a domain event per AC5).
    await testApp.deploymentsHexa.getAdapter().markPluginForRemoval({
      ...dataFactory.packmindCommand(),
      marketplaceId,
      distributionId: distributionRow.id,
    });
    await testApp.deploymentsHexa.getAdapter().cancelPluginRemoval({
      ...dataFactory.packmindCommand(),
      marketplaceId,
      distributionId: distributionRow.id,
    });

    // Run reconciliation — the descriptor is unchanged so the
    // marketplace should land back in `healthy`.
    await adapterAny._linkMarketplaceUseCase.reconciliationJob.runJob(
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

  describe('after mark → cancel → reconcile', () => {
    describe('the distribution row', () => {
      let revertedRow: MarketplaceDistribution | null;

      beforeEach(async () => {
        const distRepo = fixture.datasource.getRepository(
          MarketplaceDistributionSchema,
        );
        revertedRow = (await distRepo.findOne({
          where: { id: distributionRow.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('is reverted to success status', () => {
        expect(revertedRow?.status).toBe(DistributionStatus.success);
      });
    });

    describe('the marketplace state', () => {
      let reconciledMarketplace: Marketplace | null;

      beforeEach(async () => {
        const marketplaceRepo =
          fixture.datasource.getRepository(MarketplaceSchema);
        reconciledMarketplace = (await marketplaceRepo.findOne({
          where: { id: marketplaceId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;
      });

      it('stays healthy because the cancellation matches the descriptor', () => {
        expect(reconciledMarketplace?.state).toBe('healthy');
      });
    });
  });
});
