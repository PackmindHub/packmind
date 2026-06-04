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
 * Same descriptor with `plugin-alpha` removed directly by the marketplace
 * owner — no prior `to_be_removed` row exists in Packmind. The
 * reconciliation job must flag drift and surface the missing slug in
 * `driftedPluginSlugs` so the UI can warn admins (AC9).
 */
const DESCRIPTOR_WITHOUT_ALPHA_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [{ name: 'plugin-beta', version: '0.2.0' }],
});

describe('Marketplace plugin removal: drift detection on direct repo delete', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let marketplaceId: MarketplaceId;
  let pkg: Package;
  let liveDistributionRow: MarketplaceDistribution;

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

    // Seed a live `success` distribution for `plugin-alpha`. Crucially,
    // we do NOT mark it for removal — the marketplace owner deletes the
    // slug directly outside Packmind.
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
    liveDistributionRow = inserted as unknown as MarketplaceDistribution;

    // Descriptor now omits the slug — direct repo delete simulation.
    jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
      sha: 'mock-sha-2',
      content: DESCRIPTOR_WITHOUT_ALPHA_JSON,
    });

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

  describe('after the reconciliation sweep', () => {
    let reconciledMarketplace: Marketplace | null;

    beforeEach(async () => {
      const marketplaceRepo =
        fixture.datasource.getRepository(MarketplaceSchema);
      reconciledMarketplace = (await marketplaceRepo.findOne({
        where: { id: marketplaceId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any;
    });

    it('flags the marketplace as drift', () => {
      expect(reconciledMarketplace?.state).toBe('drift');
    });

    it('persists the missing slug in driftedPluginSlugs', () => {
      expect(reconciledMarketplace?.descriptor?.driftedPluginSlugs).toEqual([
        'plugin-alpha',
      ]);
    });

    it('keeps the live distribution row in success status', async () => {
      const distRepo = fixture.datasource.getRepository(
        MarketplaceDistributionSchema,
      );
      const stillSuccess = (await distRepo.findOne({
        where: { id: liveDistributionRow.id },
      })) as MarketplaceDistribution | null;
      expect(stillSuccess?.status).toBe(DistributionStatus.success);
    });
  });
});
