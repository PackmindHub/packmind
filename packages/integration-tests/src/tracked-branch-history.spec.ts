import { DistributionSchema } from '@packmind/deployments';
import { GitCommitSchema, GitRepoSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  Command,
  CommandDistributionHistoryEntry,
  DistributionHistoryEntry,
  GitCommit,
  GitRepo,
  Package,
  Skill,
  SkillDistributionHistoryEntry,
  Standard,
  StandardDistributionHistoryEntry,
} from '@packmind/types';
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
  let command: Command;
  let standard: Standard;
  let skill: Skill;
  let commit: GitCommit;

  beforeAll(async () => {
    await fixture.initialize();

    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    admin = new DataFactory(testApp);
    await admin.withUserAndOrganization({ email: 'admin@example.com' });

    command = await admin.withCommand({ name: 'Governed Recipe' });
    standard = await admin.withStandard({ name: 'Governed Standard' });
    skill = await testApp.skillsHexa.getAdapter().createSkill({
      ...admin.packmindCommand(),
      spaceId: admin.space.id,
      name: 'Governed Skill',
      description: 'Distributed across tracked branches',
      prompt: 'Do the governed thing',
    });

    const { package: created } = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...admin.packmindCommand(),
        spaceId: admin.space.id,
        name: 'Governed Package',
        description: 'Distributed across tracked branches',
        recipeIds: [command.id],
        standardIds: [standard.id],
        skillIds: [skill.id],
      });
    distributedPackage = created;

    commit = await fixture.datasource
      .getRepository(GitCommitSchema)
      .save(gitCommitFactory());

    fixture.snapshot();
  });

  // The publish job runs inline in these tests, so the commit must be stubbed;
  // spies are restored after each test, hence beforeEach rather than beforeAll.
  beforeEach(() => {
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

  function displayedHistory(): Promise<DistributionHistoryEntry[]> {
    return testApp.deploymentsHexa.getAdapter().listDeploymentsByPackage({
      ...admin.packmindCommand(),
      organizationId: admin.organization.id,
      spaceId: admin.space.id,
      packageId: distributedPackage.id,
    });
  }

  function displayedCommandHistory(): Promise<
    CommandDistributionHistoryEntry[]
  > {
    return testApp.deploymentsHexa.getAdapter().listDistributionsByCommand({
      ...admin.packmindCommand(),
      recipeId: command.id,
    });
  }

  function displayedStandardHistory(): Promise<
    StandardDistributionHistoryEntry[]
  > {
    return testApp.deploymentsHexa.getAdapter().listDistributionsByStandard({
      ...admin.packmindCommand(),
      standardId: standard.id,
    });
  }

  function displayedSkillHistory(): Promise<SkillDistributionHistoryEntry[]> {
    return testApp.deploymentsHexa.getAdapter().listDistributionsBySkill({
      ...admin.packmindCommand(),
      skillId: skill.id,
    });
  }

  function branchesOf(
    history: { target: { gitRepo?: { branch: string } } }[],
  ): (string | undefined)[] {
    return history.map((distribution) => distribution.target.gitRepo?.branch);
  }

  async function displayedBranches(): Promise<(string | undefined)[]> {
    const history = await displayedHistory();
    return history.map((distribution) => distribution.target.gitRepo?.branch);
  }

  // The Deployments overview rail is a second surface over the same rows, and
  // has to apply the tracked-branch filter just like the history lists do.
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

    /*
     * The other three histories read the same rows through their own query. Each
     * one loads the versions of its own artifact and leaves the other two
     * behind: they hang off the same distributed package, so joining them makes
     * SQL return standards x commands x skills rows per distribution.
     */
    describe('the command history over those same distributions', () => {
      it('displays only the tracked branch', async () => {
        expect(branchesOf(await displayedCommandHistory())).toEqual([
          'main',
          'main',
        ]);
      });

      it('carries the version of that command', async () => {
        const [distributedPackage] = (await displayedCommandHistory())[0]
          .distributedPackages;

        expect(
          distributedPackage.recipeVersions.map((version) => version.recipeId),
        ).toEqual([command.id]);
      });

      it('loads no standard versions', async () => {
        const [distributedPackage] = (await displayedCommandHistory())[0]
          .distributedPackages;

        expect(distributedPackage).not.toHaveProperty('standardVersions');
      });

      it('loads no skill versions', async () => {
        const [distributedPackage] = (await displayedCommandHistory())[0]
          .distributedPackages;

        expect(distributedPackage).not.toHaveProperty('skillVersions');
      });
    });

    describe('the standard history over those same distributions', () => {
      it('displays only the tracked branch', async () => {
        expect(branchesOf(await displayedStandardHistory())).toEqual([
          'main',
          'main',
        ]);
      });

      it('carries the version of that standard', async () => {
        const [distributedPackage] = (await displayedStandardHistory())[0]
          .distributedPackages;

        expect(
          distributedPackage.standardVersions.map(
            (version) => version.standardId,
          ),
        ).toEqual([standard.id]);
      });

      it('loads no command versions', async () => {
        const [distributedPackage] = (await displayedStandardHistory())[0]
          .distributedPackages;

        expect(distributedPackage).not.toHaveProperty('recipeVersions');
      });

      it('loads no skill versions', async () => {
        const [distributedPackage] = (await displayedStandardHistory())[0]
          .distributedPackages;

        expect(distributedPackage).not.toHaveProperty('skillVersions');
      });
    });

    describe('the skill history over those same distributions', () => {
      it('displays only the tracked branch', async () => {
        expect(branchesOf(await displayedSkillHistory())).toEqual([
          'main',
          'main',
        ]);
      });

      it('carries the version of that skill', async () => {
        const [distributedPackage] = (await displayedSkillHistory())[0]
          .distributedPackages;

        expect(
          distributedPackage.skillVersions.map((version) => version.skillId),
        ).toEqual([skill.id]);
      });

      it('loads no standard versions', async () => {
        const [distributedPackage] = (await displayedSkillHistory())[0]
          .distributedPackages;

        expect(distributedPackage).not.toHaveProperty('standardVersions');
      });

      it('loads no command versions', async () => {
        const [distributedPackage] = (await displayedSkillHistory())[0]
          .distributedPackages;

        expect(distributedPackage).not.toHaveProperty('recipeVersions');
      });
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

  // Branch-count equivalence class: two branches, one tracked. Removal has to
  // hide both, which only works because a removed row shadows itself in
  // TRACKED_BRANCH_SCOPE; without that the overview would list every branch.
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

  // The removal predicate scopes both the shadowed row and its governing
  // sibling to one organization. Two organizations legitimately track the same
  // owner/repo, so a removal in one must not hide the other's history.
  describe('when two organizations track the same owner/repo', () => {
    let otherAdmin: DataFactory;
    let otherPackage: Package;

    const otherHistoryBranches = (): Promise<(string | undefined)[]> =>
      testApp.deploymentsHexa
        .getAdapter()
        .listDeploymentsByPackage({
          ...otherAdmin.packmindCommand(),
          organizationId: otherAdmin.organization.id,
          spaceId: otherAdmin.space.id,
          packageId: otherPackage.id,
        })
        .then((history) =>
          history.map((distribution) => distribution.target.gitRepo?.branch),
        );

    beforeEach(async () => {
      otherAdmin = new DataFactory(testApp);
      await otherAdmin.withUserAndOrganization({ email: 'other@example.com' });

      const otherCommand = await otherAdmin.withCommand({
        name: 'Other Recipe',
      });
      const { package: created } = await testApp.deploymentsHexa
        .getAdapter()
        .createPackage({
          ...otherAdmin.packmindCommand(),
          spaceId: otherAdmin.space.id,
          name: 'Other Package',
          description: 'Owned by the second organization',
          recipeIds: [otherCommand.id],
          standardIds: [],
        });
      otherPackage = created;

      const mainRepo = await setTracked('main');
      await distributeTo(mainRepo);

      const otherRepo = await testApp.gitHexa
        .getAdapter()
        .setTrackedRepository({
          ...otherAdmin.packmindCommand(),
          owner: OWNER,
          repo: REPO,
          branch: 'main',
          origin: 'track',
          providerVendor: 'github',
          gitRemoteUrl: GIT_REMOTE_URL,
        });
      const otherTargets = await testApp.deploymentsHexa
        .getAdapter()
        .getTargetsByGitRepo({
          ...otherAdmin.packmindCommand(),
          gitRepoId: otherRepo.id,
        });
      await testApp.deploymentsHexa.getAdapter().publishPackages({
        ...otherAdmin.packmindCommand(),
        packageIds: [otherPackage.id],
        targetIds: [otherTargets[0].id],
      });

      await removeTracked();
    });

    it('hides the repository for the organization that removed tracking', async () => {
      await expect(displayedBranches()).resolves.toEqual([]);
    });

    it('leaves the other organization history visible', async () => {
      await expect(otherHistoryBranches()).resolves.toEqual(['main']);
    });

    it('keeps the other organization tracking intact', async () => {
      const tracked = await testApp.gitHexa.getAdapter().getTrackedRepository({
        ...otherAdmin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
      });

      expect(tracked.gitRepo?.branch).toBe('main');
    });
  });
});
