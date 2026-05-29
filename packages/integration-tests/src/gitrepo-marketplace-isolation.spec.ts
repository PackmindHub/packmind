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
    it('getOrganizationRepositories excludes marketplace repos', async () => {
      const repos = await gitPort.getOrganizationRepositories(
        dataFactory.organization.id,
      );

      const ids = repos.map((r) => r.id);
      expect(ids).toContain(standardGitRepo.id);
      expect(ids).not.toContain(marketplaceGitRepo.id);
    });

    it('listRepos for the provider excludes marketplace repos', async () => {
      const repos = await gitPort.listRepos(gitProvider.id);

      const ids = repos.map((r) => r.id);
      expect(ids).toContain(standardGitRepo.id);
      expect(ids).not.toContain(marketplaceGitRepo.id);
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
    it('throws when the gitRepoId is marketplace-typed', async () => {
      await expect(
        testApp.deploymentsHexa.getAdapter().addTarget({
          ...dataFactory.packmindCommand(),
          name: 'Should not be allowed',
          path: '/',
          gitRepoId: marketplaceGitRepo.id,
        }),
      ).rejects.toThrow(/Repository with id .* not found/);
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
    it('the marketplace row is reachable via the underlying GitRepo schema query', async () => {
      // Sanity check that the marketplace row really exists, so the
      // assertions above are meaningful (rather than passing because the
      // fixture is empty).
      const gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
      const found = await gitRepoRepo.findOne({
        where: { id: marketplaceGitRepo.id },
      });

      expect(found).not.toBeNull();
      expect(found?.type).toBe('marketplace');
    });
  });

  describe('LinkMarketplace rejects collision with an existing standard repo', () => {
    it('throws GitRepoAlreadyLinkedAsStandardError when the same coords are already standard', async () => {
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

    it('does not enqueue a reconciliation job when the link is rejected', async () => {
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

      expect(scheduleRecurringSpy).not.toHaveBeenCalled();
      expect(addJobSpy).not.toHaveBeenCalled();
    });
  });
});
