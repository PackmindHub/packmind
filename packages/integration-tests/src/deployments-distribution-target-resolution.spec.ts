import { GitProviderSchema, GitRepoSchema } from '@packmind/git';
import { GitProvider, GitRepo, PackmindLockFile } from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const OWNER = 'find-or-create-org';
const REPO = 'find-or-create-repo';
const GIT_REMOTE_URL = `https://github.com/${OWNER}/${REPO}.git`;
const GIT_BRANCH = 'main';

const emptyLockFile: PackmindLockFile = {
  lockfileVersion: 2,
  packageSlugs: [],
  agents: [],
  artifacts: {},
};

/**
 * Distributions are recorded only against repositories that were set up
 * beforehand (creating a provider or repo is an admin-only operation).
 * Notifying a distribution never provisions a provider or repo on the fly.
 */
describe('Deployments distribution target resolution integration', () => {
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
      where: { owner: OWNER, repo: REPO },
    });
  }

  function findProviders(): Promise<GitProvider[]> {
    return fixture.datasource
      .getRepository(GitProviderSchema)
      .find({ where: { url: 'https://github.com' } });
  }

  function notify() {
    return testApp.deploymentsHexa.getAdapter().notifyArtefactsDistribution({
      ...dataFactory.packmindCommand(),
      gitRemoteUrl: GIT_REMOTE_URL,
      gitBranch: GIT_BRANCH,
      relativePath: '.',
      packmindLockFile: emptyLockFile,
    });
  }

  describe('when notifying a distribution for a remote with no repository set up', () => {
    let response: Awaited<ReturnType<typeof notify>>;

    beforeEach(async () => {
      response = await notify();
    });

    it('does not record a distribution', () => {
      expect(response.deploymentId).toBeNull();
    });

    it('does not create a git repository', async () => {
      expect(await findRepos()).toHaveLength(0);
    });

    it('does not create a git provider', async () => {
      expect(await findProviders()).toHaveLength(0);
    });
  });

  describe('when the repository has been set up beforehand', () => {
    beforeEach(async () => {
      await dataFactory.withGitProvider({ url: 'https://github.com' });
      await dataFactory.withGitRepo({
        owner: OWNER,
        repo: REPO,
        branch: GIT_BRANCH,
      });
    });

    it('records the distribution against the existing repository', async () => {
      const response = await notify();

      expect(response.deploymentId).not.toBeNull();
    });

    it('does not create an additional repository', async () => {
      await notify();

      expect(await findRepos()).toHaveLength(1);
    });
  });
});
