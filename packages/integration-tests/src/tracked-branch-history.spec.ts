import { DistributionSchema } from '@packmind/deployments';
import { GitCommitSchema, GitRepoSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import { Distribution, GitRepo, Package } from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const OWNER = 'my-orga';
const REPO = 'my-repo';
const GIT_REMOTE_URL = 'https://github.com/my-orga/my-repo.git';

const UNTRACKED_OWNER = 'legacy-orga';
const UNTRACKED_REPO = 'legacy-repo';
const UNTRACKED_GIT_REMOTE_URL =
  'https://github.com/legacy-orga/legacy-repo.git';

describe('Tracked branch distribution history integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let admin: DataFactory;
  let distributedPackage: Package;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    admin = new DataFactory(testApp);
    await admin.withUserAndOrganization({ email: 'admin@example.com' });

    const command = await admin.withCommand({ name: 'Governed Recipe' });
    const { package: created } = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...admin.packmindCommand(),
        spaceId: admin.space.id,
        name: 'Governed Package',
        description: 'Distributed across tracked branches',
        recipeIds: [command.id],
        standardIds: [],
      });
    distributedPackage = created;

    // Deployment is asynchronous; stub the commit so no real git work happens.
    const commit = await fixture.datasource
      .getRepository(GitCommitSchema)
      .save(gitCommitFactory());
    jest
      .spyOn(testApp.gitHexa.getAdapter(), 'commitToGit')
      .mockResolvedValue(commit);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  function setTracked(branch: string): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().setTrackedRepository({
      ...admin.packmindCommand(),
      owner: OWNER,
      repo: REPO,
      branch,
      origin: 'track',
      providerVendor: 'github',
      gitRemoteUrl: GIT_REMOTE_URL,
    });
  }

  function updateTracked(branch: string): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().updateTrackedBranch({
      ...admin.packmindCommand(),
      owner: OWNER,
      repo: REPO,
      branch,
    });
  }

  function removeTracked(): Promise<unknown> {
    return testApp.gitHexa.getAdapter().removeTrackedRepository({
      ...admin.packmindCommand(),
      owner: OWNER,
      repo: REPO,
    });
  }

  function findOrCreateRepo(
    owner: string,
    repo: string,
    branch: string,
    gitRemoteUrl: string,
  ): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().findOrCreateGitRepo({
      ...admin.packmindCommand(),
      owner,
      repo,
      branch,
      providerVendor: 'github',
      gitRemoteUrl,
    });
  }

  async function distributeTo(gitRepo: GitRepo): Promise<void> {
    const targets = await testApp.deploymentsHexa
      .getAdapter()
      .getTargetsByGitRepo({
        ...admin.packmindCommand(),
        gitRepoId: gitRepo.id,
      });

    await testApp.deploymentsHexa.getAdapter().publishPackages({
      ...admin.packmindCommand(),
      packageIds: [distributedPackage.id],
      targetIds: [targets[0].id],
    });
  }

  function displayedHistory(): Promise<Distribution[]> {
    return testApp.deploymentsHexa.getAdapter().listDeploymentsByPackage({
      ...admin.packmindCommand(),
      packageId: distributedPackage.id,
    });
  }

  async function displayedBranches(): Promise<(string | undefined)[]> {
    const history = await displayedHistory();
    return history.map((distribution) => distribution.target.gitRepo?.branch);
  }

  // The Deployments overview / repositories rail. Reviewers reported untracked
  // branches still showing here after the history lists were filtered.
  async function overviewBranches(): Promise<(string | undefined)[]> {
    const overview = await testApp.deploymentsHexa
      .getAdapter()
      .listActiveDistributedPackagesBySpace({
        ...admin.packmindCommand(),
        spaceId: admin.space.id,
      });
    return overview.map((entry) => entry.gitRepo?.branch);
  }

  // Reads straight through the schema, bypassing the display filter, to prove
  // that hidden history is still on disk.
  function storedDistributionCount(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<number> {
    return fixture.datasource
      .getRepository(DistributionSchema)
      .createQueryBuilder('distribution')
      .innerJoin('distribution.target', 'target')
      .innerJoin('target.gitRepo', 'gitRepo')
      .where('gitRepo.owner = :owner', { owner })
      .andWhere('gitRepo.repo = :repo', { repo })
      .andWhere('gitRepo.branch = :branch', { branch })
      .getCount();
  }

  describe('when the tracked branch round-trips main -> dev -> main', () => {
    let initialMainRepo: GitRepo;
    let finalMainRepo: GitRepo;

    beforeEach(async () => {
      initialMainRepo = await setTracked('main');
      await distributeTo(initialMainRepo);

      const devRepo = await updateTracked('dev');
      await distributeTo(devRepo);

      finalMainRepo = await updateTracked('main');
      await distributeTo(finalMainRepo);
    });

    it('returns to the original main repository row', () => {
      expect(finalMainRepo.id).toBe(initialMainRepo.id);
    });

    it('appends the new distribution to the earlier main history', async () => {
      await expect(displayedHistory()).resolves.toHaveLength(2);
    });

    it('displays only the tracked branch', async () => {
      await expect(displayedBranches()).resolves.toEqual(['main', 'main']);
    });

    it('hides the distribution made while dev was tracked', async () => {
      await expect(displayedBranches()).resolves.not.toContain('dev');
    });

    it('retains the hidden dev distribution', async () => {
      await expect(storedDistributionCount(OWNER, REPO, 'dev')).resolves.toBe(
        1,
      );
    });

    it('retains both main distributions', async () => {
      await expect(storedDistributionCount(OWNER, REPO, 'main')).resolves.toBe(
        2,
      );
    });

    it('shows only the tracked branch in the overview', async () => {
      await expect(overviewBranches()).resolves.toEqual(['main']);
    });
  });

  describe('when tracking has moved away from a branch that has history', () => {
    beforeEach(async () => {
      const mainRepo = await setTracked('main');
      await distributeTo(mainRepo);

      const devRepo = await updateTracked('dev');
      await distributeTo(devRepo);
    });

    it('displays only the newly tracked branch', async () => {
      await expect(displayedBranches()).resolves.toEqual(['dev']);
    });

    it('drops the branch left behind from the overview', async () => {
      await expect(overviewBranches()).resolves.toEqual(['dev']);
    });

    it('retains the history of the branch left behind', async () => {
      await expect(storedDistributionCount(OWNER, REPO, 'main')).resolves.toBe(
        1,
      );
    });
  });

  describe('when a repository has never been tracked', () => {
    beforeEach(async () => {
      const legacyMain = await findOrCreateRepo(
        UNTRACKED_OWNER,
        UNTRACKED_REPO,
        'main',
        UNTRACKED_GIT_REMOTE_URL,
      );
      await distributeTo(legacyMain);

      const legacyDev = await findOrCreateRepo(
        UNTRACKED_OWNER,
        UNTRACKED_REPO,
        'dev',
        UNTRACKED_GIT_REMOTE_URL,
      );
      await distributeTo(legacyDev);
    });

    it('keeps every branch visible', async () => {
      await expect(displayedBranches()).resolves.toEqual(
        expect.arrayContaining(['main', 'dev']),
      );
    });

    it('displays one entry per branch', async () => {
      await expect(displayedHistory()).resolves.toHaveLength(2);
    });

    it('keeps every branch in the overview', async () => {
      await expect(overviewBranches()).resolves.toEqual(
        expect.arrayContaining(['main', 'dev']),
      );
    });
  });

  describe('when tracking is removed and then restored on the same branch', () => {
    let mainRepo: GitRepo;

    beforeEach(async () => {
      mainRepo = await setTracked('main');
      await distributeTo(mainRepo);
      await distributeTo(mainRepo);
      await distributeTo(mainRepo);

      await removeTracked();
    });

    it('drops the repository from the distribution history', async () => {
      await expect(displayedBranches()).resolves.toEqual([]);
    });

    it('drops the repository from the overview', async () => {
      await expect(overviewBranches()).resolves.toEqual([]);
    });

    it('keeps every recorded distribution on disk', async () => {
      await expect(storedDistributionCount(OWNER, REPO, 'main')).resolves.toBe(
        3,
      );
    });

    describe('and tracking is set again on main', () => {
      let restoredRepo: GitRepo;

      beforeEach(async () => {
        restoredRepo = await setTracked('main');
      });

      it('reuses the original repository row', () => {
        expect(restoredRepo.id).toEqual(mainRepo.id);
      });

      it('shows the earlier distributions again', async () => {
        const history = await displayedHistory();
        expect(history).toHaveLength(3);
      });

      it('appends a new distribution to them', async () => {
        await distributeTo(restoredRepo);

        const history = await displayedHistory();
        expect(history).toHaveLength(4);
      });

      it('creates no duplicate repository row', async () => {
        const rows = await fixture.datasource
          .getRepository(GitRepoSchema)
          .createQueryBuilder('gitRepo')
          .where('gitRepo.owner = :owner', { owner: OWNER })
          .andWhere('gitRepo.repo = :repo', { repo: REPO })
          .andWhere('gitRepo.branch = :branch', { branch: 'main' })
          .getCount();

        expect(rows).toBe(1);
      });
    });
  });

  // Branch-count equivalence class: two branches, one tracked. Before the
  // removed-state column, a repository with no tracked sibling was left alone
  // by the predicate and the overview reverted to listing every branch.
  describe('when tracking is removed on a repository that has a second branch', () => {
    beforeEach(async () => {
      const mainRepo = await setTracked('main');
      await distributeTo(mainRepo);

      const devRepo = await findOrCreateRepo(
        OWNER,
        REPO,
        'dev',
        GIT_REMOTE_URL,
      );
      await distributeTo(devRepo);

      await removeTracked();
    });

    it('hides both branches from the overview', async () => {
      await expect(overviewBranches()).resolves.toEqual([]);
    });

    it('hides both branches from the history', async () => {
      await expect(displayedBranches()).resolves.toEqual([]);
    });

    it('retains the untracked branch history', async () => {
      await expect(storedDistributionCount(OWNER, REPO, 'dev')).resolves.toBe(
        1,
      );
    });

    describe('and dev is tracked instead', () => {
      beforeEach(async () => {
        await setTracked('dev');
      });

      it('shows only dev', async () => {
        await expect(displayedBranches()).resolves.toEqual(['dev']);
      });
    });
  });

  // Branch-count equivalence class: nothing distributed yet.
  describe('when tracking is removed before anything was distributed', () => {
    beforeEach(async () => {
      await setTracked('main');
    });

    it('succeeds', async () => {
      await expect(removeTracked()).resolves.toBeDefined();
    });
  });

  // Protects the backend half of "tracking governs display, not capture":
  // a distribution recorded on an untracked branch is kept and surfaces the
  // moment that branch is tracked.
  describe('when a branch is distributed to before it is tracked', () => {
    beforeEach(async () => {
      const devRepo = await findOrCreateRepo(
        OWNER,
        REPO,
        'dev',
        GIT_REMOTE_URL,
      );
      await distributeTo(devRepo);
      await setTracked('main');
    });

    it('hides the untracked branch', async () => {
      await expect(displayedBranches()).resolves.toEqual([]);
    });

    describe('and that branch is tracked later', () => {
      beforeEach(async () => {
        await updateTracked('dev');
      });

      it('surfaces the distribution recorded before tracking', async () => {
        await expect(displayedBranches()).resolves.toEqual(['dev']);
      });
    });
  });

  describe('when one repository is tracked and another is not', () => {
    beforeEach(async () => {
      const mainRepo = await setTracked('main');
      await distributeTo(mainRepo);

      const devRepo = await updateTracked('dev');
      await distributeTo(devRepo);

      const legacyRepo = await findOrCreateRepo(
        UNTRACKED_OWNER,
        UNTRACKED_REPO,
        'main',
        UNTRACKED_GIT_REMOTE_URL,
      );
      await distributeTo(legacyRepo);
    });

    it('filters the tracked repository without hiding the untracked one', async () => {
      const history = await displayedHistory();

      expect(
        history.map((distribution) => ({
          repo: distribution.target.gitRepo?.repo,
          branch: distribution.target.gitRepo?.branch,
        })),
      ).toEqual(
        expect.arrayContaining([
          { repo: REPO, branch: 'dev' },
          { repo: UNTRACKED_REPO, branch: 'main' },
        ]),
      );
    });

    it('displays one entry per visible branch', async () => {
      await expect(displayedHistory()).resolves.toHaveLength(2);
    });
  });
});
