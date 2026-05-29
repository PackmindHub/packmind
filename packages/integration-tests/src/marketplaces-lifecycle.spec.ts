import {
  GitProvider,
  IGitPort,
  MarketplaceId,
  MarketplaceLinkedEvent,
  MarketplaceLinkedPayload,
  MarketplaceUnlinkedEvent,
  MarketplaceUnlinkedPayload,
  User,
  UserOrganizationMembership,
  createUserId,
} from '@packmind/types';
import { gitProviderFactory } from '@packmind/git/test';
import { GitRepoSchema } from '@packmind/git';
import { MarketplaceSchema } from '@packmind/deployments';
import {
  PackmindEventEmitterService,
  PackmindListener,
} from '@packmind/node-utils';
import { v4 as uuidv4 } from 'uuid';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

/**
 * Stub adapter capturing emitted marketplace events. The integration test
 * subscribes a `PackmindListener` to confirm that the link/unlink flow emits
 * the expected domain events with the right payloads.
 */
interface StubMarketplaceAdapter {
  onMarketplaceLinked(payload: MarketplaceLinkedPayload): void;
  onMarketplaceUnlinked(payload: MarketplaceUnlinkedPayload): void;
}

class StubMarketplaceListener extends PackmindListener<StubMarketplaceAdapter> {
  protected registerHandlers(): void {
    this.subscribe(MarketplaceLinkedEvent, this.handleMarketplaceLinked);
    this.subscribe(MarketplaceUnlinkedEvent, this.handleMarketplaceUnlinked);
  }

  private handleMarketplaceLinked = (event: MarketplaceLinkedEvent): void => {
    this.adapter.onMarketplaceLinked(event.payload);
  };

  private handleMarketplaceUnlinked = (
    event: MarketplaceUnlinkedEvent,
  ): void => {
    this.adapter.onMarketplaceUnlinked(event.payload);
  };
}

const ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  version: '1.0.0',
  plugins: [
    { name: 'plugin-alpha', version: '0.1.0' },
    { name: 'plugin-beta', version: '0.2.0' },
    { name: 'plugin-gamma' },
  ],
});

describe('Marketplace lifecycle integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let gitPort: IGitPort;
  let getFileFromRepoSpy: jest.SpyInstance;
  let scheduleRecurringSpy: jest.SpyInstance;
  let addJobSpy: jest.SpyInstance;
  let cancelRecurringSpy: jest.SpyInstance;
  let eventEmitterService: PackmindEventEmitterService;
  let stubMarketplaceAdapter: jest.Mocked<StubMarketplaceAdapter>;
  let stubMarketplaceListener: StubMarketplaceListener;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization({ email: 'admin@example.com' });

    // A token-bearing GitProvider — `LinkMarketplaceUseCase` requires
    // `hasToken=true` so it can fetch `marketplace.json`. We seed via the
    // existing factory (token: 'test-token') so the live use case sees a
    // realistic provider.
    ({ gitProvider } = await dataFactory.withGitProvider(
      gitProviderFactory({ token: 'gh-pat-test-token' }),
    ));

    gitPort = testApp.gitHexa.getAdapter();

    // Stub the file fetch — we never reach a real Git host in the test
    // stack. The descriptor JSON has the Anthropic shape so the parser
    // registry's `AnthropicMarketplaceDescriptorParser` claims it.
    getFileFromRepoSpy = jest
      .spyOn(gitPort, 'getFileFromRepo')
      .mockResolvedValue({
        sha: 'mock-sha',
        content: ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON,
      });

    // Spy on the reconciliation job scheduler. The link use case enqueues
    // both the recurring job and an immediate run; the unlink use case
    // cancels the recurring job. We assert call counts without depending on
    // BullMQ internals.
    const deploymentsAdapter = testApp.deploymentsHexa.getAdapter();
    // Cast through the adapter's private field to spy on the job —
    // production wiring stores the same job instance for both use cases.
    const adapterAny = deploymentsAdapter as unknown as {
      _linkMarketplaceUseCase: {
        // The link use case keeps a reference to the reconciliation job.
        reconciliationJob: {
          scheduleRecurring: (id: MarketplaceId) => Promise<void>;
          addJob: (params: { marketplaceId: MarketplaceId }) => Promise<string>;
          cancelRecurring: (id: MarketplaceId) => Promise<void>;
        };
      };
    };
    const reconciliationJob =
      adapterAny._linkMarketplaceUseCase.reconciliationJob;
    scheduleRecurringSpy = jest
      .spyOn(reconciliationJob, 'scheduleRecurring')
      .mockResolvedValue(undefined);
    addJobSpy = jest
      .spyOn(reconciliationJob, 'addJob')
      .mockResolvedValue('mock-job-id');
    cancelRecurringSpy = jest
      .spyOn(reconciliationJob, 'cancelRecurring')
      .mockResolvedValue(undefined);

    // Subscribe a stub listener so we can confirm domain events fired.
    eventEmitterService = testApp.registry.getService(
      PackmindEventEmitterService,
    );
    stubMarketplaceAdapter = {
      onMarketplaceLinked: jest.fn(),
      onMarketplaceUnlinked: jest.fn(),
    };
    stubMarketplaceListener = new StubMarketplaceListener(
      stubMarketplaceAdapter,
    );
    stubMarketplaceListener.initialize(eventEmitterService);
  });

  afterEach(async () => {
    eventEmitterService.removeAllListeners();
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  /**
   * Seeds an inactive (non-admin) second user with a *member* membership on
   * the same organization, so list-marketplaces tests can confirm members
   * see the marketplace too.
   */
  async function seedNonAdminMember(): Promise<User> {
    const userId = createUserId(uuidv4());
    const userRepo = fixture.datasource.getRepository('User');
    const membershipRepo = fixture.datasource.getRepository(
      'UserOrganizationMembership',
    );

    const user = (await userRepo.save({
      id: userId,
      email: 'member@example.com',
      displayName: 'Member User',
      passwordHash: null,
      active: true,
      trial: false,
    })) as User;

    const membership: UserOrganizationMembership = {
      userId,
      organizationId: dataFactory.organization.id,
      role: 'member',
    };
    await membershipRepo.save(membership);

    return user;
  }

  describe('link → list → unlink happy path', () => {
    let linkResponse: Awaited<
      ReturnType<
        ReturnType<typeof testApp.deploymentsHexa.getAdapter>['linkMarketplace']
      >
    >;

    beforeEach(async () => {
      linkResponse = await testApp.deploymentsHexa
        .getAdapter()
        .linkMarketplace({
          ...dataFactory.packmindCommand(),
          gitProviderId: gitProvider.id,
          owner: 'anthropic',
          repo: 'marketplace',
          branch: 'main',
          name: 'Anthropic Marketplace',
        });
    });

    describe('after linkMarketplace', () => {
      it('persists a Marketplace row for the organization', async () => {
        const marketplaceRepo =
          fixture.datasource.getRepository(MarketplaceSchema);
        const stored = await marketplaceRepo.findOne({
          where: { id: linkResponse.id },
        });

        expect(stored).not.toBeNull();
        expect(stored?.organizationId).toBe(dataFactory.organization.id);
        expect(stored?.name).toBe('Anthropic Marketplace');
        expect(stored?.vendor).toBe('anthropic');
        expect(stored?.pluginCount).toBe(3);
      });

      it('persists the underlying GitRepo with type=marketplace', async () => {
        const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
        const storedRepo = await gitRepoRepo.findOne({
          where: { id: linkResponse.gitRepoId },
        });

        expect(storedRepo).not.toBeNull();
        expect(storedRepo?.type).toBe('marketplace');
        expect(storedRepo?.owner).toBe('anthropic');
        expect(storedRepo?.repo).toBe('marketplace');
      });

      it('fetched marketplace.json via the git port', () => {
        expect(getFileFromRepoSpy).toHaveBeenCalledTimes(1);
        const [, filePath] = getFileFromRepoSpy.mock.calls[0];
        expect(filePath).toBe('marketplace.json');
      });

      it('emits MarketplaceLinkedEvent exactly once', () => {
        expect(
          stubMarketplaceAdapter.onMarketplaceLinked,
        ).toHaveBeenCalledTimes(1);
      });

      it('emits MarketplaceLinkedEvent with the expected payload', () => {
        const payload =
          stubMarketplaceAdapter.onMarketplaceLinked.mock.calls[0][0];
        expect(payload.marketplaceId).toBe(linkResponse.id);
        expect(payload.organizationId).toBe(dataFactory.organization.id);
        expect(payload.gitRepoId).toBe(linkResponse.gitRepoId);
        expect(payload.addedBy).toBe(dataFactory.user.id);
        expect(payload.userId).toBe(dataFactory.user.id);
      });

      it('enqueues the recurring reconciliation job', () => {
        expect(scheduleRecurringSpy).toHaveBeenCalledTimes(1);
        expect(scheduleRecurringSpy).toHaveBeenCalledWith(linkResponse.id);
      });

      it('enqueues an immediate reconciliation run', () => {
        expect(addJobSpy).toHaveBeenCalledTimes(1);
        expect(addJobSpy).toHaveBeenCalledWith({
          marketplaceId: linkResponse.id,
        });
      });
    });

    describe('listMarketplaces', () => {
      it('returns the marketplace to org members', async () => {
        const memberUser = await seedNonAdminMember();

        const items = await testApp.deploymentsHexa
          .getAdapter()
          .listMarketplaces({
            userId: memberUser.id,
            organizationId: dataFactory.organization.id,
          });

        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(linkResponse.id);
      });

      it('denormalizes addedByUserName onto each list item', async () => {
        const items = await testApp.deploymentsHexa
          .getAdapter()
          .listMarketplaces(dataFactory.packmindCommand());

        // DataFactory seeds the admin with email `admin@example.com` and no
        // displayName, so `addedByUserName` should fall back to the email.
        expect(items[0].addedByUserName).toBe('admin@example.com');
      });

      it('returns the denormalized pluginCount from the row', async () => {
        const items = await testApp.deploymentsHexa
          .getAdapter()
          .listMarketplaces(dataFactory.packmindCommand());

        expect(items[0].pluginCount).toBe(3);
      });
    });

    describe('unlinkMarketplace', () => {
      let marketplaceId: MarketplaceId;

      beforeEach(async () => {
        marketplaceId = linkResponse.id;

        await testApp.deploymentsHexa.getAdapter().unlinkMarketplace({
          ...dataFactory.packmindCommand(),
          marketplaceId,
        });
      });

      it('soft-deletes the Marketplace row', async () => {
        const marketplaceRepo =
          fixture.datasource.getRepository(MarketplaceSchema);

        const liveRow = await marketplaceRepo.findOne({
          where: { id: marketplaceId },
        });
        expect(liveRow).toBeNull();

        const softDeletedRow = await marketplaceRepo.findOne({
          where: { id: marketplaceId },
          withDeleted: true,
        });
        expect(softDeletedRow).not.toBeNull();
        expect(softDeletedRow?.deletedAt).not.toBeNull();
      });

      it('soft-deletes the underlying marketplace-typed GitRepo', async () => {
        const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);

        const liveRow = await gitRepoRepo.findOne({
          where: { id: linkResponse.gitRepoId },
        });
        expect(liveRow).toBeNull();

        const softDeletedRow = await gitRepoRepo.findOne({
          where: { id: linkResponse.gitRepoId },
          withDeleted: true,
        });
        expect(softDeletedRow).not.toBeNull();
        expect(softDeletedRow?.deletedAt).not.toBeNull();
        expect(softDeletedRow?.type).toBe('marketplace');
      });

      it('emits MarketplaceUnlinkedEvent exactly once', () => {
        expect(
          stubMarketplaceAdapter.onMarketplaceUnlinked,
        ).toHaveBeenCalledTimes(1);
      });

      it('emits MarketplaceUnlinkedEvent with the expected payload', () => {
        const payload =
          stubMarketplaceAdapter.onMarketplaceUnlinked.mock.calls[0][0];
        expect(payload.marketplaceId).toBe(marketplaceId);
        expect(payload.organizationId).toBe(dataFactory.organization.id);
        expect(payload.gitRepoId).toBe(linkResponse.gitRepoId);
        expect(payload.userId).toBe(dataFactory.user.id);
      });

      it('cancels the recurring reconciliation job', () => {
        expect(cancelRecurringSpy).toHaveBeenCalledTimes(1);
        expect(cancelRecurringSpy).toHaveBeenCalledWith(marketplaceId);
      });

      it('removes the marketplace from listMarketplaces results', async () => {
        const items = await testApp.deploymentsHexa
          .getAdapter()
          .listMarketplaces(dataFactory.packmindCommand());

        expect(items).toEqual([]);
      });
    });
  });
});
