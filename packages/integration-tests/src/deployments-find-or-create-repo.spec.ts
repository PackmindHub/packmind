import { GitProviderSchema, GitRepoSchema } from '@packmind/git';
import { GitProvider, GitRepo, PackmindLockFile } from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const GIT_REMOTE_URL =
  'https://github.com/find-or-create-org/find-or-create-repo.git';
const GIT_BRANCH = 'main';

const emptyLockFile: PackmindLockFile = {
  lockfileVersion: 2,
  packageSlugs: [],
  agents: [],
  artifacts: {},
};

/**
 * After the deployments refactor, TargetResolutionService delegates the
 * provider+repo provisioning to IGitPort.findOrCreateGitRepo. This verifies the
 * end-to-end behavior is preserved: notifying a distribution for an unknown git
 * remote still auto-creates the git provider and the git repo.
 */
describe('Deployments find-or-create repo integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let dataFactory: DataFactory;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  function findRepos(): Promise<GitRepo[]> {
    return fixture.datasource.getRepository(GitRepoSchema).find({
      where: { owner: 'find-or-create-org', repo: 'find-or-create-repo' },
    });
  }

  function findProviders(): Promise<GitProvider[]> {
    return fixture.datasource
      .getRepository(GitProviderSchema)
      .find({ where: { url: 'https://github.com' } });
  }

  describe('when notifying a distribution for an unknown git remote', () => {
    beforeEach(async () => {
      await testApp.deploymentsHexa.getAdapter().notifyArtefactsDistribution({
        ...dataFactory.packmindCommand(),
        gitRemoteUrl: GIT_REMOTE_URL,
        gitBranch: GIT_BRANCH,
        relativePath: '.',
        packmindLockFile: emptyLockFile,
      });
    });

    it('auto-creates the git repository for the notified branch', async () => {
      const repos = await findRepos();
      expect(repos.map((r) => r.branch)).toEqual([GIT_BRANCH]);
    });

    it('auto-creates a git provider for the notified remote', async () => {
      const providers = await findProviders();
      expect(providers).toHaveLength(1);
    });
  });

  describe('when notifying a distribution twice for the same git remote', () => {
    beforeEach(async () => {
      const notify = () =>
        testApp.deploymentsHexa.getAdapter().notifyArtefactsDistribution({
          ...dataFactory.packmindCommand(),
          gitRemoteUrl: GIT_REMOTE_URL,
          gitBranch: GIT_BRANCH,
          relativePath: '.',
          packmindLockFile: emptyLockFile,
        });
      await notify();
      await notify();
    });

    it('reuses the existing git repository instead of duplicating it', async () => {
      const repos = await findRepos();
      expect(repos).toHaveLength(1);
    });
  });
});
