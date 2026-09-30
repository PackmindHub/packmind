import { GitCommitSchema, GitProviderSchema } from '@packmind/git';
import { gitCommitFactory, gitProviderFactory } from '@packmind/git/test';
import {
  DistributionHistoryEntry,
  GitCommit,
  GitProvider,
  GitRepo,
  Package,
  Target,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const OWNER = 'optimetriks';
const REPO = 'smala-native';
const BRANCH = 'v4staging';
const GIT_REMOTE_URL = 'https://github.com/optimetriks/smala-native.git';

/**
 * An organization that started with `packmind` CLI sessions only, then
 * connected an authenticated provider for the same host: adding a repository
 * the CLI already recorded must move it under that provider, keeping its
 * history, instead of refusing it as a duplicate.
 */
describe('CLI-managed repository adoption integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let admin: DataFactory;
  let distributedPackage: Package;
  let commit: GitCommit;

  beforeAll(async () => {
    await fixture.initialize();

    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    admin = new DataFactory(testApp);
    await admin.withUserAndOrganization({ email: 'admin@example.com' });

    const standard = await admin.withStandard({ name: 'Adopted Standard' });
    const { package: created } = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...admin.packmindCommand(),
        spaceId: admin.space.id,
        name: 'Adopted Package',
        description: 'Distributed before the provider was connected',
        recipeIds: [],
        standardIds: [standard.id],
        skillIds: [],
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

  function recordFromCli(
    owner = OWNER,
    repo = REPO,
    branch = BRANCH,
  ): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().findOrCreateGitRepo({
      ...admin.packmindCommand(),
      owner,
      repo,
      branch,
      providerVendor: 'github',
      gitRemoteUrl: GIT_REMOTE_URL,
    });
  }

  // Saved straight through the schema: connecting it through the use case
  // would probe the token against GitHub.
  function connectAuthenticatedProvider(): Promise<GitProvider> {
    return fixture.datasource.getRepository(GitProviderSchema).save(
      gitProviderFactory({
        organizationId: admin.organization.id,
        source: 'github',
        url: 'https://github.com',
        token: 'authenticated-token',
        authMethod: 'token',
      }),
    );
  }

  function addFromApp(provider: GitProvider): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().addGitRepo({
      ...admin.packmindCommand(),
      gitProviderId: provider.id,
      owner: OWNER,
      repo: REPO,
      branch: BRANCH,
    });
  }

  function targetsOf(gitRepo: GitRepo): Promise<Target[]> {
    return testApp.deploymentsHexa.getAdapter().getTargetsByGitRepo({
      ...admin.packmindCommand(),
      gitRepoId: gitRepo.id,
    });
  }

  async function distributeTo(gitRepo: GitRepo): Promise<void> {
    const [target] = await targetsOf(gitRepo);
    await testApp.deploymentsHexa.getAdapter().publishPackages({
      ...admin.packmindCommand(),
      packageIds: [distributedPackage.id],
      targetIds: [target.id],
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

  describe('when a repository recorded by the CLI is added under an authenticated provider', () => {
    let cliRepo: GitRepo;
    let cliTargets: Target[];
    let provider: GitProvider;
    let adoptedRepo: GitRepo;

    beforeEach(async () => {
      cliRepo = await recordFromCli();
      cliTargets = await targetsOf(cliRepo);
      await distributeTo(cliRepo);

      provider = await connectAuthenticatedProvider();
      adoptedRepo = await addFromApp(provider);
    });

    it('keeps the repository id', () => {
      expect(adoptedRepo.id).toBe(cliRepo.id);
    });

    it('moves the repository under the authenticated provider', () => {
      expect(adoptedRepo.providerId).toBe(provider.id);
    });

    it('keeps the existing targets', async () => {
      expect(await targetsOf(adoptedRepo)).toEqual(cliTargets);
    });

    it('keeps the distribution history visible', async () => {
      expect(
        (await displayedHistory()).map((entry) => entry.target.gitRepo?.id),
      ).toEqual([cliRepo.id]);
    });
  });

  describe('when the CLI spelled the repository with another case', () => {
    let cliRepo: GitRepo;
    let adoptedRepo: GitRepo;

    beforeEach(async () => {
      cliRepo = await recordFromCli('Optimetriks', 'Smala-Native');
      adoptedRepo = await addFromApp(await connectAuthenticatedProvider());
    });

    it('adopts the same repository', () => {
      expect(adoptedRepo.id).toBe(cliRepo.id);
    });
  });

  describe('when the CLI-recorded repository had its tracking removed', () => {
    let cliRepo: GitRepo;

    beforeEach(async () => {
      cliRepo = await testApp.gitHexa.getAdapter().setTrackedRepository({
        ...admin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
        branch: BRANCH,
        origin: 'track',
        providerVendor: 'github',
        gitRemoteUrl: GIT_REMOTE_URL,
      });
      await distributeTo(cliRepo);
      await testApp.gitHexa.getAdapter().removeTrackedRepository({
        ...admin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
      });

      await addFromApp(await connectAuthenticatedProvider());
    });

    it('shows the adopted repository history again', async () => {
      expect(
        (await displayedHistory()).map((entry) => entry.target.gitRepo?.id),
      ).toEqual([cliRepo.id]);
    });
  });

  describe('when tracking was removed on another branch of the repository', () => {
    let adoptedRepo: GitRepo;

    beforeEach(async () => {
      const mainRepo = await testApp.gitHexa.getAdapter().setTrackedRepository({
        ...admin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
        branch: 'main',
        origin: 'track',
        providerVendor: 'github',
        gitRemoteUrl: GIT_REMOTE_URL,
      });
      await distributeTo(mainRepo);
      await testApp.gitHexa.getAdapter().removeTrackedRepository({
        ...admin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
      });

      await distributeTo(await recordFromCli(OWNER, REPO, BRANCH));
      adoptedRepo = await addFromApp(await connectAuthenticatedProvider());
    });

    it('shows the adopted branch history', async () => {
      expect(
        (await displayedHistory()).map((entry) => entry.target.gitRepo?.id),
      ).toContain(adoptedRepo.id);
    });
  });
});
