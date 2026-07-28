import { DistributionSchema } from '@packmind/deployments';
import { GitCommitSchema } from '@packmind/git';
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
    // The cli-repo-tracking flag is enabled for the @packmind.com domain.
    await admin.withUserAndOrganization({ email: 'admin@packmind.com' });

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
