import { GitRepoSchema } from '@packmind/git';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import {
  GitRepo,
  NoTrackedRepositoryError,
  RepositoryAlreadyTrackedError,
  UserId,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const OWNER = 'my-org';
const REPO = 'my-repo';
const GIT_REMOTE_URL = 'https://github.com/my-org/my-repo.git';

describe('Tracked repository integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let admin: DataFactory;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    admin = new DataFactory(testApp);
    // The cli-repo-tracking flag is enabled for the @packmind.com domain.
    await admin.withUserAndOrganization({ email: 'admin@packmind.com' });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  function setTracked(branch: string, origin: 'init' | 'track' = 'track') {
    return testApp.gitHexa.getAdapter().setTrackedRepository({
      ...admin.packmindCommand(),
      owner: OWNER,
      repo: REPO,
      branch,
      origin,
      providerVendor: 'github',
      gitRemoteUrl: GIT_REMOTE_URL,
    });
  }

  function updateTracked(branch: string) {
    return testApp.gitHexa.getAdapter().updateTrackedBranch({
      ...admin.packmindCommand(),
      owner: OWNER,
      repo: REPO,
      branch,
    });
  }

  async function getTrackedBranch(): Promise<string | null> {
    const { gitRepo } = await testApp.gitHexa
      .getAdapter()
      .getTrackedRepository({
        ...admin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
      });
    return gitRepo?.branch ?? null;
  }

  async function findRow(branch: string): Promise<GitRepo | null> {
    return fixture.datasource
      .getRepository(GitRepoSchema)
      .findOne({ where: { owner: OWNER, repo: REPO, branch } });
  }

  async function countTrackedRows(): Promise<number> {
    return fixture.datasource
      .getRepository(GitRepoSchema)
      .count({ where: { owner: OWNER, repo: REPO, isTracked: true } });
  }

  describe('when setting a tracked repository with nothing tracked yet', () => {
    let tracked: GitRepo;

    beforeEach(async () => {
      tracked = await setTracked('main');
    });

    it('marks the repository as tracked', () => {
      expect(tracked.isTracked).toBe(true);
    });

    it('records the requested branch', () => {
      expect(tracked.branch).toBe('main');
    });

    it('is reflected by getTrackedRepository', async () => {
      expect(await getTrackedBranch()).toBe('main');
    });
  });

  describe('when setting the same branch that is already tracked', () => {
    let firstId: GitRepo['id'];
    let second: GitRepo;

    beforeEach(async () => {
      const first = await setTracked('main');
      firstId = first.id;
      second = await setTracked('main');
    });

    it('returns the already-tracked repository unchanged', () => {
      expect(second.id).toBe(firstId);
    });
  });

  describe('when setting a different branch while one is already tracked', () => {
    beforeEach(async () => {
      await setTracked('main');
    });

    it('throws RepositoryAlreadyTrackedError', async () => {
      await expect(setTracked('dev')).rejects.toThrow(
        RepositoryAlreadyTrackedError,
      );
    });
  });

  describe('when updating the tracked branch', () => {
    let updated: GitRepo;

    beforeEach(async () => {
      await setTracked('main');
      updated = await updateTracked('dev');
    });

    it('tracks the new branch', () => {
      expect(updated.branch).toBe('dev');
    });

    it('marks the new branch row as tracked', () => {
      expect(updated.isTracked).toBe(true);
    });

    it('is reflected by getTrackedRepository', async () => {
      expect(await getTrackedBranch()).toBe('dev');
    });

    it('clears isTracked on the previous branch row', async () => {
      const previous = await findRow('main');
      expect(previous?.isTracked).toBe(false);
    });
  });

  describe('when updating to the branch already tracked', () => {
    beforeEach(async () => {
      await setTracked('main');
    });

    it('throws RepositoryAlreadyTrackedError', async () => {
      await expect(updateTracked('main')).rejects.toThrow(
        RepositoryAlreadyTrackedError,
      );
    });
  });

  describe('when updating while nothing is tracked', () => {
    it('throws NoTrackedRepositoryError', async () => {
      await expect(updateTracked('dev')).rejects.toThrow(
        NoTrackedRepositoryError,
      );
    });
  });

  describe('when the tracked branch is changed twice in succession (last-one-wins)', () => {
    beforeEach(async () => {
      await setTracked('main');
      // Two admins move the tracked branch one after another; the last
      // committed change is the effective tracked branch, with no error.
      await updateTracked('dev');
      await updateTracked('feature-x');
    });

    it('tracks the last requested branch', async () => {
      expect(await getTrackedBranch()).toBe('feature-x');
    });

    it('keeps exactly one branch tracked', async () => {
      expect(await countTrackedRows()).toBe(1);
    });
  });

  describe('when a non-admin member sets a tracked repository', () => {
    let member: UserId;

    beforeEach(async () => {
      const invitations = await testApp.accountsHexa
        .getAdapter()
        .createInvitations({
          ...admin.packmindCommand(),
          emails: ['member@packmind.com'],
          role: 'member',
        });
      const created = invitations.created[0];
      await testApp.accountsHexa.getAdapter().activateUserAccount({
        token: created.invitation.token,
        password: 'some-secret-password!!',
      });
      member = created.userId;
    });

    it('throws OrganizationAdminRequiredError', async () => {
      await expect(
        testApp.gitHexa.getAdapter().setTrackedRepository({
          userId: member,
          organizationId: admin.organization.id,
          owner: OWNER,
          repo: REPO,
          branch: 'main',
          origin: 'track',
          providerVendor: 'github',
          gitRemoteUrl: GIT_REMOTE_URL,
        }),
      ).rejects.toThrow(OrganizationAdminRequiredError);
    });
  });
});
