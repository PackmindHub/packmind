import { DistributionSchema } from '@packmind/deployments';
import {
  ActiveDistributedPackagesByTarget,
  GitRepo,
  Package,
  PackmindLockFile,
  Standard,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const OWNER = 'acme';
const REPO = 'ops';
const GIT_REMOTE_URL = 'https://github.com/acme/ops.git';

describe('Distribution state synced from lock files integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let admin: DataFactory;
  let distributedPackage: Package;
  let standard: Standard;
  let repoFiles: Record<string, string>;

  beforeAll(async () => {
    await fixture.initialize();

    testApp = new TestApp(fixture.datasource);
    await testApp.initialize();

    admin = new DataFactory(testApp);
    await admin.withUserAndOrganization({ email: 'tech-lead@example.com' });

    standard = await admin.withStandard({ name: 'Ops Standard' });

    const { package: created } = await testApp.deploymentsHexa
      .getAdapter()
      .createPackage({
        ...admin.packmindCommand(),
        spaceId: admin.space.id,
        name: 'Ops',
        description: 'Distributed from lock files',
        recipeIds: [],
        standardIds: [standard.id],
        skillIds: [],
      });
    distributedPackage = created;

    fixture.snapshot();
  });

  beforeEach(() => {
    repoFiles = {};
    const gitAdapter = testApp.gitHexa.getAdapter();
    jest
      .spyOn(gitAdapter, 'listFilesNamedInRepo')
      .mockImplementation(async (_repo, fileName) =>
        Object.keys(repoFiles).filter(
          (path) => path.split('/').pop() === fileName,
        ),
      );
    jest
      .spyOn(gitAdapter, 'getFileFromRepo')
      .mockImplementation(async (_repo, path) =>
        path in repoFiles ? { sha: 'sha', content: repoFiles[path] } : null,
      );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  const packageSlug = () => `@${admin.space.slug}/${distributedPackage.slug}`;

  function lockListing(version: string): string {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 2,
      packageSlugs: [packageSlug()],
      packages: { [packageSlug()]: version },
      agents: ['claude'],
      artifacts: {
        'user:standard:ops-standard': {
          name: standard.name,
          type: 'standard',
          id: standard.id,
          version: standard.version,
          spaceId: admin.space.id,
          packageIds: [distributedPackage.id],
          files: [],
          source: 'user',
        },
      },
    };
    return JSON.stringify(lockFile);
  }

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

  function forceSync(gitRepo: GitRepo) {
    return testApp.deploymentsHexa.getAdapter().syncDistributionsFromLockFiles({
      ...admin.packmindCommand(),
      gitRepoId: gitRepo.id,
    });
  }

  function overview(): Promise<ActiveDistributedPackagesByTarget[]> {
    return testApp.deploymentsHexa
      .getAdapter()
      .listActiveDistributedPackagesBySpace({
        ...admin.packmindCommand(),
        spaceId: admin.space.id,
      });
  }

  async function shownVersions(): Promise<Record<string, string | null>> {
    const entries = await overview();
    return Object.fromEntries(
      entries.map((entry) => [
        entry.target.path,
        entry.packages[0]?.versionSpec ?? null,
      ]),
    );
  }

  function storedDistributionCount(): Promise<number> {
    return fixture.datasource.getRepository(DistributionSchema).count();
  }

  describe('when a repository with an existing lock gets tracked', () => {
    beforeEach(async () => {
      repoFiles = { 'packmind-lock.json': lockListing('1.2.3') };

      await setTracked('main');
    });

    it('shows the version the lock lists on the root target', async () => {
      await expect(shownVersions()).resolves.toEqual({ '/': '1.2.3' });
    });
  });

  describe('when the lock was edited by hand and a sync is forced', () => {
    let gitRepo: GitRepo;

    beforeEach(async () => {
      repoFiles = { 'packmind-lock.json': lockListing('1.2.3') };
      gitRepo = await setTracked('main');

      repoFiles = {
        'packmind-lock.json': lockListing('1.3.0'),
        'app/frontend/packmind-lock.json': lockListing('1.3.0'),
      };
      await forceSync(gitRepo);
    });

    it('shows the new version on every target', async () => {
      await expect(shownVersions()).resolves.toEqual({
        '/': '1.3.0',
        '/app/frontend/': '1.3.0',
      });
    });

    describe('when the sync is forced again with nothing changed', () => {
      let countBefore: number;

      beforeEach(async () => {
        countBefore = await storedDistributionCount();

        await forceSync(gitRepo);
      });

      it('records no new distribution', async () => {
        await expect(storedDistributionCount()).resolves.toBe(countBefore);
      });
    });
  });
});
