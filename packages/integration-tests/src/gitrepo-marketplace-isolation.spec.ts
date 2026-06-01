import {
  GitProvider,
  GitRepo,
  GitRepoAlreadyLinkedAsStandardError,
  IGitPort,
  createGitRepoId,
} from '@packmind/types';
import { gitProviderFactory } from '@packmind/git/test';
import { GitRepoSchema } from '@packmind/git';
import { v4 as uuidv4 } from 'uuid';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON = JSON.stringify({
  name: 'Anthropic Marketplace',
  vendor: 'anthropic',
  plugins: [{ name: 'plugin-alpha' }],
});

describe('GitRepo finder isolation (AC-15)', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;
  let gitProvider: GitProvider;
  let standardGitRepo: GitRepo;
  let marketplaceGitRepo: GitRepo;
  let gitPort: IGitPort;
  let scheduleRecurringSpy: jest.SpyInstance;
  let addJobSpy: jest.SpyInstance;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization({ email: 'admin@example.com' });

    ({ gitProvider } = await dataFactory.withGitProvider(
      gitProviderFactory({ token: 'gh-pat-test-token' }),
    ));

    // Standard-typed repo via the normal AddGitRepo flow (which also creates
    // a default Target).
    ({ gitRepo: standardGitRepo } = await dataFactory.withGitRepo({
      owner: 'octocat',
      repo: 'hello-world',
      branch: 'main',
      providerId: gitProvider.id,
    }));

    gitPort = testApp.gitHexa.getAdapter();

    // Marketplace-typed repo — seed directly into the DB to keep the test
    // focused on finder isolation (i.e. don't drive LinkMarketplaceUseCase
    // here; that's covered in marketplaces-lifecycle.spec.ts).
    const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
    marketplaceGitRepo = (await gitRepoRepo.save({
      id: createGitRepoId(uuidv4()),
      owner: 'anthropic',
      repo: 'marketplace',
      branch: 'main',
      providerId: gitProvider.id,
      type: 'marketplace',
    })) as GitRepo;

    // Stub the file fetch + reconciliation job for the LinkMarketplaceUseCase
    // collision path exercised at the end of this file.
    jest.spyOn(gitPort, 'getFileFromRepo').mockResolvedValue({
      sha: 'mock-sha',
      content: ANTHROPIC_MARKETPLACE_DESCRIPTOR_JSON,
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
    scheduleRecurringSpy = jest
      .spyOn(
        adapterAny._linkMarketplaceUseCase.reconciliationJob,
        'scheduleRecurring',
      )
      .mockResolvedValue(undefined);
    addJobSpy = jest
      .spyOn(adapterAny._linkMarketplaceUseCase.reconciliationJob, 'addJob')
      .mockResolvedValue('mock-job-id');
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  describe('GitRepo finder defaults filter type=standard', () => {
    describe('getOrganizationRepositories', () => {
      let ids: string[];

      beforeEach(async () => {
        const repos = await gitPort.getOrganizationRepositories(
          dataFactory.organization.id,
        );

        ids = repos.map((r) => r.id);
      });

      it('includes the standard repo', () => {
        expect(ids).toContain(standardGitRepo.id);
      });

      it('excludes the marketplace repo', () => {
        expect(ids).not.toContain(marketplaceGitRepo.id);
      });
    });

    describe('listRepos for the provider', () => {
      let ids: string[];

      beforeEach(async () => {
        const repos = await gitPort.listRepos(gitProvider.id);

        ids = repos.map((r) => r.id);
      });

      it('includes the standard repo', () => {
        expect(ids).toContain(standardGitRepo.id);
      });

      it('excludes the marketplace repo', () => {
        expect(ids).not.toContain(marketplaceGitRepo.id);
      });
    });

    it('findGitRepoByOwnerAndRepo never returns the marketplace row by its coords', async () => {
      const found = await gitPort.findGitRepoByOwnerAndRepo(
        marketplaceGitRepo.owner,
        marketplaceGitRepo.repo,
      );

      expect(found).toBeNull();
    });

    it('getRepositoryById on a marketplace id returns null (filtered)', async () => {
      const found = await gitPort.getRepositoryById(marketplaceGitRepo.id);

      expect(found).toBeNull();
    });
  });

  describe('AddTarget refuses a marketplace-typed gitRepoId', () => {
    // AddTargetUseCase resolves the gitRepo via GitRepoService.findGitRepoById
    // (standard-only). Passing a marketplace id should be treated as
    // "repository not found", confirming the marketplace cannot accidentally
    // become a deployment target.
    describe('when the gitRepoId is marketplace-typed', () => {
      it('throws', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().addTarget({
            ...dataFactory.packmindCommand(),
            name: 'Should not be allowed',
            path: '/',
            gitRepoId: marketplaceGitRepo.id,
          }),
        ).rejects.toThrow(/Repository with id .* not found/);
      });
    });

    it('still allows AddTarget on the standard-typed gitRepoId', async () => {
      const target = await testApp.deploymentsHexa.getAdapter().addTarget({
        ...dataFactory.packmindCommand(),
        name: 'Extra Standard Target',
        path: '/packages/foo',
        gitRepoId: standardGitRepo.id,
      });

      expect(target.gitRepoId).toBe(standardGitRepo.id);
    });
  });

  describe('Marketplace-aware finders see only marketplace rows', () => {
    describe('the marketplace row reached via the underlying GitRepo schema query', () => {
      // Sanity check that the marketplace row really exists, so the
      // assertions above are meaningful (rather than passing because the
      // fixture is empty).
      let found: GitRepo | null;

      beforeEach(async () => {
        const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
        found = (await gitRepoRepo.findOne({
          where: { id: marketplaceGitRepo.id },
        })) as GitRepo | null;
      });

      it('is reachable', () => {
        expect(found).not.toBeNull();
      });

      it('has type marketplace', () => {
        expect(found?.type).toBe('marketplace');
      });
    });
  });

  describe('LinkMarketplace rejects collision with an existing standard repo', () => {
    describe('when the same coords are already standard', () => {
      it('throws GitRepoAlreadyLinkedAsStandardError', async () => {
        await expect(
          testApp.deploymentsHexa.getAdapter().linkMarketplace({
            ...dataFactory.packmindCommand(),
            gitProviderId: gitProvider.id,
            owner: standardGitRepo.owner,
            repo: standardGitRepo.repo,
            branch: standardGitRepo.branch,
            name: 'Should-be-rejected Marketplace',
          }),
        ).rejects.toThrow(GitRepoAlreadyLinkedAsStandardError);
      });
    });

    describe('when the link is rejected', () => {
      beforeEach(async () => {
        try {
          await testApp.deploymentsHexa.getAdapter().linkMarketplace({
            ...dataFactory.packmindCommand(),
            gitProviderId: gitProvider.id,
            owner: standardGitRepo.owner,
            repo: standardGitRepo.repo,
            branch: standardGitRepo.branch,
            name: 'Should-be-rejected Marketplace',
          });
        } catch {
          // expected
        }
      });

      it('does not schedule a recurring reconciliation job', () => {
        expect(scheduleRecurringSpy).not.toHaveBeenCalled();
      });

      it('does not enqueue a reconciliation job', () => {
        expect(addJobSpy).not.toHaveBeenCalled();
      });
    });
  });
});
