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
      describe('the persisted Marketplace row', () => {
        let stored: Awaited<
          ReturnType<
            ReturnType<typeof fixture.datasource.getRepository>['findOne']
          >
        >;

        beforeEach(async () => {
          const marketplaceRepo =
            fixture.datasource.getRepository(MarketplaceSchema);
          stored = await marketplaceRepo.findOne({
            where: { id: linkResponse.id },
          });
        });

        it('exists', () => {
          expect(stored).not.toBeNull();
        });

        it('belongs to the organization', () => {
          expect(stored?.organizationId).toBe(dataFactory.organization.id);
        });

        it('keeps the marketplace name', () => {
          expect(stored?.name).toBe('Anthropic Marketplace');
        });

        it('records the vendor', () => {
          expect(stored?.vendor).toBe('anthropic');
        });

        it('records the plugin count', () => {
          expect(stored?.pluginCount).toBe(3);
        });
      });

      describe('the persisted GitRepo', () => {
        let storedRepo: Awaited<
          ReturnType<
            ReturnType<typeof fixture.datasource.getRepository>['findOne']
          >
        >;

        beforeEach(async () => {
          const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
          storedRepo = await gitRepoRepo.findOne({
            where: { id: linkResponse.gitRepoId },
          });
        });

        it('exists', () => {
          expect(storedRepo).not.toBeNull();
        });

        it('has type=marketplace', () => {
          expect(storedRepo?.type).toBe('marketplace');
        });

        it('keeps the owner', () => {
          expect(storedRepo?.owner).toBe('anthropic');
        });

        it('keeps the repo name', () => {
          expect(storedRepo?.repo).toBe('marketplace');
        });
      });

      it('fetched the descriptor exactly once via the git port', () => {
        expect(getFileFromRepoSpy).toHaveBeenCalledTimes(1);
      });

      it('probed .claude-plugin/marketplace.json as the descriptor path', () => {
        const [, filePath] = getFileFromRepoSpy.mock.calls[0];
        expect(filePath).toBe('.claude-plugin/marketplace.json');
      });

      it('emits MarketplaceLinkedEvent exactly once', () => {
        expect(
          stubMarketplaceAdapter.onMarketplaceLinked,
        ).toHaveBeenCalledTimes(1);
      });

      describe('the emitted MarketplaceLinkedEvent payload', () => {
        let payload: MarketplaceLinkedPayload;

        beforeEach(() => {
          payload = stubMarketplaceAdapter.onMarketplaceLinked.mock.calls[0][0];
        });

        it('carries the marketplaceId', () => {
          expect(payload.marketplaceId).toBe(linkResponse.id);
        });

        it('carries the organizationId', () => {
          expect(payload.organizationId).toBe(dataFactory.organization.id);
        });

        it('carries the gitRepoId', () => {
          expect(payload.gitRepoId).toBe(linkResponse.gitRepoId);
        });

        it('carries addedBy', () => {
          expect(payload.addedBy).toBe(dataFactory.user.id);
        });

        it('carries the userId', () => {
          expect(payload.userId).toBe(dataFactory.user.id);
        });
      });

      describe('enqueues the recurring reconciliation job', () => {
        it('calls scheduleRecurring exactly once', () => {
          expect(scheduleRecurringSpy).toHaveBeenCalledTimes(1);
        });

        it('schedules with the marketplace id', () => {
          expect(scheduleRecurringSpy).toHaveBeenCalledWith(linkResponse.id);
        });
      });

      describe('enqueues an immediate reconciliation run', () => {
        it('calls addJob exactly once', () => {
          expect(addJobSpy).toHaveBeenCalledTimes(1);
        });

        it('adds the job with the marketplace id', () => {
          expect(addJobSpy).toHaveBeenCalledWith({
            marketplaceId: linkResponse.id,
          });
        });
      });
    });

    describe('listMarketplaces', () => {
      describe('for org members', () => {
        let items: Awaited<
          ReturnType<
            ReturnType<
              typeof testApp.deploymentsHexa.getAdapter
            >['listMarketplaces']
          >
        >;

        beforeEach(async () => {
          const memberUser = await seedNonAdminMember();

          items = await testApp.deploymentsHexa.getAdapter().listMarketplaces({
            userId: memberUser.id,
            organizationId: dataFactory.organization.id,
          });
        });

        it('returns a single marketplace', () => {
          expect(items).toHaveLength(1);
        });

        it('returns the linked marketplace', () => {
          expect(items[0].id).toBe(linkResponse.id);
        });
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

      it('enriches each list item with its backing repository', async () => {
        const items = await testApp.deploymentsHexa
          .getAdapter()
          .listMarketplaces(dataFactory.packmindCommand());

        expect(items[0].repository).toMatchObject({
          owner: 'anthropic',
          repo: 'marketplace',
          url: 'https://github.com/anthropic/marketplace',
        });
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

      describe('soft-deletes the Marketplace row', () => {
        let liveRow: Awaited<
          ReturnType<
            ReturnType<typeof fixture.datasource.getRepository>['findOne']
          >
        >;
        let softDeletedRow: Awaited<
          ReturnType<
            ReturnType<typeof fixture.datasource.getRepository>['findOne']
          >
        >;

        beforeEach(async () => {
          const marketplaceRepo =
            fixture.datasource.getRepository(MarketplaceSchema);

          liveRow = await marketplaceRepo.findOne({
            where: { id: marketplaceId },
          });

          softDeletedRow = await marketplaceRepo.findOne({
            where: { id: marketplaceId },
            withDeleted: true,
          });
        });

        it('hides the row from live queries', () => {
          expect(liveRow).toBeNull();
        });

        it('keeps the row available with withDeleted', () => {
          expect(softDeletedRow).not.toBeNull();
        });

        it('stamps deletedAt on the row', () => {
          expect(softDeletedRow?.deletedAt).not.toBeNull();
        });
      });

      describe('soft-deletes the underlying marketplace-typed GitRepo', () => {
        let liveRow: Awaited<
          ReturnType<
            ReturnType<typeof fixture.datasource.getRepository>['findOne']
          >
        >;
        let softDeletedRow: Awaited<
          ReturnType<
            ReturnType<typeof fixture.datasource.getRepository>['findOne']
          >
        >;

        beforeEach(async () => {
          const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);

          liveRow = await gitRepoRepo.findOne({
            where: { id: linkResponse.gitRepoId },
          });

          softDeletedRow = await gitRepoRepo.findOne({
            where: { id: linkResponse.gitRepoId },
            withDeleted: true,
          });
        });

        it('hides the row from live queries', () => {
          expect(liveRow).toBeNull();
        });

        it('keeps the row available with withDeleted', () => {
          expect(softDeletedRow).not.toBeNull();
        });

        it('stamps deletedAt on the row', () => {
          expect(softDeletedRow?.deletedAt).not.toBeNull();
        });

        it('keeps the type as marketplace', () => {
          expect(softDeletedRow?.type).toBe('marketplace');
        });
      });

      it('emits MarketplaceUnlinkedEvent exactly once', () => {
        expect(
          stubMarketplaceAdapter.onMarketplaceUnlinked,
        ).toHaveBeenCalledTimes(1);
      });

      describe('the emitted MarketplaceUnlinkedEvent payload', () => {
        let payload: MarketplaceUnlinkedPayload;

        beforeEach(() => {
          payload =
            stubMarketplaceAdapter.onMarketplaceUnlinked.mock.calls[0][0];
        });

        it('carries the marketplaceId', () => {
          expect(payload.marketplaceId).toBe(marketplaceId);
        });

        it('carries the organizationId', () => {
          expect(payload.organizationId).toBe(dataFactory.organization.id);
        });

        it('carries the gitRepoId', () => {
          expect(payload.gitRepoId).toBe(linkResponse.gitRepoId);
        });

        it('carries the userId', () => {
          expect(payload.userId).toBe(dataFactory.user.id);
        });
      });

      describe('cancels the recurring reconciliation job', () => {
        it('calls cancelRecurring exactly once', () => {
          expect(cancelRecurringSpy).toHaveBeenCalledTimes(1);
        });

        it('cancels with the marketplace id', () => {
          expect(cancelRecurringSpy).toHaveBeenCalledWith(marketplaceId);
        });
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
