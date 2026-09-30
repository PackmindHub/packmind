import {
  GitCommitSchema,
  GitProviderSchema,
  GitRepoSchema,
} from '@packmind/git';
import {
  gitCommitFactory,
  gitProviderFactory,
  gitRepoFactory,
} from '@packmind/git/test';
import {
  DistributionHistoryEntry,
  GitCommit,
  GitProvider,
  GitProviderId,
  GitRepo,
  GitRepoAlreadyExistsError,
  Package,
  Target,
  UnresolvableGitProviderError,
  createGitProviderId,
} from '@packmind/types';
import { createIntegrationTestFixture } from './helpers/createIntegrationTestFixture';
import { DataFactory } from './helpers/DataFactory';
import { integrationTestSchemas } from './helpers/makeIntegrationTestDataSource';
import { TestApp } from './helpers/TestApp';

const HOST = 'https://gitlab.acme.io';
const OWNER = 'acme';
const REPO = 'app';
const BRANCH = 'main';
const HTTPS_REMOTE = 'https://gitlab.acme.io/acme/app.git';

type Coordinate = { owner?: string; repo?: string; branch?: string };

/**
 * A self-hosted GitLab first used through `packmind` CLI sessions only, then
 * connected with a token: adding a repository on the token connection must
 * move it there with its history, and the CLI must keep finding it there.
 * The CLI of today sends `providerVendor: 'unknown'` for any self-hosted host.
 */
describe('Self-hosted CLI-managed repository adoption integration', () => {
  const fixture = createIntegrationTestFixture(integrationTestSchemas);

  let testApp: TestApp;
  let admin: DataFactory;
  let distributedPackage: Package;
  let commit: GitCommit;
  let accessibleRepos: Map<GitProviderId, string[]>;

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
        description: 'Distributed before the token connection existed',
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

  // The publish job runs inline and the self-hosted API is not reachable from
  // the tests: commits and repository listings are stubbed. Spies are
  // restored after each test, hence beforeEach rather than beforeAll.
  beforeEach(() => {
    accessibleRepos = new Map();
    const gitAdapter = testApp.gitHexa.getAdapter();
    jest.spyOn(gitAdapter, 'commitToGit').mockResolvedValue(commit);
    jest
      .spyOn(gitAdapter, 'listAvailableRepos')
      .mockImplementation(async ({ gitProviderId }) => {
        const repos = accessibleRepos.get(gitProviderId);
        if (repos === undefined) {
          throw new Error('Request failed with status code 401');
        }
        return {
          currentPage: 1,
          availablePages: 1,
          lastLoadedPage: 1,
          partial: false,
          repositories: repos.map((fullName) => {
            const separator = fullName.lastIndexOf('/');
            const owner = fullName.slice(0, separator);
            const name = fullName.slice(separator + 1);
            return {
              owner,
              name,
              private: true,
              defaultBranch: BRANCH,
              stars: 0,
            };
          }),
        };
      });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  function recordFromCli(
    options: Coordinate & {
      remote?: string;
      providerVendor?: string;
      by?: DataFactory;
    } = {},
  ): Promise<GitRepo> {
    const by = options.by ?? admin;
    return testApp.gitHexa.getAdapter().findOrCreateGitRepo({
      ...by.packmindCommand(),
      owner: options.owner ?? OWNER,
      repo: options.repo ?? REPO,
      branch: options.branch ?? BRANCH,
      providerVendor: options.providerVendor ?? 'unknown',
      gitRemoteUrl: options.remote ?? HTTPS_REMOTE,
    });
  }

  function trackFromCli(): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().setTrackedRepository({
      ...admin.packmindCommand(),
      owner: OWNER,
      repo: REPO,
      branch: BRANCH,
      origin: 'track',
      providerVendor: 'unknown',
      gitRemoteUrl: HTTPS_REMOTE,
    });
  }

  // Saved straight through the schema: connecting it through the use case
  // would probe the token against the self-hosted instance.
  async function connectTokenProvider(
    url = HOST,
    options: { accessTo?: string[] } = {},
  ): Promise<GitProvider> {
    const provider = await fixture.datasource
      .getRepository(GitProviderSchema)
      .save(
        gitProviderFactory({
          organizationId: admin.organization.id,
          source: 'gitlab',
          url,
          token: 'glpat-self-hosted',
          authMethod: 'token',
        }),
      );
    accessibleRepos.set(provider.id, options.accessTo ?? [`${OWNER}/${REPO}`]);
    return provider;
  }

  // A ghost as older servers left it, written without going through the CLI.
  async function saveGhost(url: string, repos: Coordinate[]) {
    const ghost = await fixture.datasource
      .getRepository(GitProviderSchema)
      .save(
        gitProviderFactory({
          organizationId: admin.organization.id,
          source: 'unknown',
          url,
          token: null,
          authMethod: 'token',
        }),
      );
    const saved = await Promise.all(
      repos.map((coordinate) =>
        fixture.datasource.getRepository(GitRepoSchema).save(
          gitRepoFactory({
            providerId: createGitProviderId(ghost.id),
            owner: coordinate.owner ?? OWNER,
            repo: coordinate.repo ?? REPO,
            branch: coordinate.branch ?? BRANCH,
          }),
        ),
      ),
    );
    return { ghost, repos: saved };
  }

  function addFromApp(
    provider: GitProvider,
    coordinate: Coordinate = {},
  ): Promise<GitRepo> {
    return testApp.gitHexa.getAdapter().addGitRepo({
      ...admin.packmindCommand(),
      gitProviderId: provider.id,
      owner: coordinate.owner ?? OWNER,
      repo: coordinate.repo ?? REPO,
      branch: coordinate.branch ?? BRANCH,
    });
  }

  async function providerIds(by: DataFactory = admin): Promise<string[]> {
    const { providers } = await testApp.gitHexa.getAdapter().listProviders({
      ...by.packmindCommand(),
      organizationId: by.organization.id,
    });
    return providers.map((provider) => provider.id);
  }

  async function currentProviderOf(gitRepo: GitRepo): Promise<string> {
    const stored = await fixture.datasource
      .getRepository(GitRepoSchema)
      .findOneByOrFail({ id: gitRepo.id });
    return stored.providerId;
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

  async function historyRepoIds(): Promise<(string | undefined)[]> {
    const history: DistributionHistoryEntry[] = await testApp.deploymentsHexa
      .getAdapter()
      .listDeploymentsByPackage({
        ...admin.packmindCommand(),
        organizationId: admin.organization.id,
        spaceId: admin.space.id,
        packageId: distributedPackage.id,
      });
    return history.map((entry) => entry.target.gitRepo?.id);
  }

  describe('when the admin adds the CLI repository on the token connection', () => {
    let cliRepo: GitRepo;
    let cliTargets: Target[];
    let token: GitProvider;
    let adopted: GitRepo;

    beforeEach(async () => {
      cliRepo = await recordFromCli();
      cliTargets = await targetsOf(cliRepo);
      await distributeTo(cliRepo);

      token = await connectTokenProvider();
      adopted = await addFromApp(token);
    });

    it('keeps the repository id', () => {
      expect(adopted.id).toBe(cliRepo.id);
    });

    it('moves the repository under the token connection', () => {
      expect(adopted.providerId).toBe(token.id);
    });

    it('keeps the targets', async () => {
      expect(await targetsOf(adopted)).toEqual(cliTargets);
    });

    it('keeps the distribution history', async () => {
      expect(await historyRepoIds()).toEqual([cliRepo.id]);
    });

    it('no longer lists the CLI-managed connection', async () => {
      expect(await providerIds()).toEqual([token.id]);
    });
  });

  describe('when the CLI runs again after the adoption', () => {
    let cliRepo: GitRepo;
    let token: GitProvider;
    let again: GitRepo;

    beforeEach(async () => {
      cliRepo = await recordFromCli();
      token = await connectTokenProvider();
      await addFromApp(token);

      again = await recordFromCli();
    });

    it('returns the adopted repository', () => {
      expect(again.id).toBe(cliRepo.id);
    });

    it('does not recreate a CLI-managed connection', async () => {
      expect(await providerIds()).toEqual([token.id]);
    });

    it('lets `packmind track` track it', async () => {
      expect((await trackFromCli()).id).toBe(cliRepo.id);
    });
  });

  describe('when the CLI first sees the repository after the token connection exists', () => {
    let token: GitProvider;
    let repo: GitRepo;

    beforeEach(async () => {
      token = await connectTokenProvider();
      repo = await recordFromCli();
    });

    it('creates it under the token connection', () => {
      expect(repo.providerId).toBe(token.id);
    });

    it('creates no CLI-managed connection', async () => {
      expect(await providerIds()).toEqual([token.id]);
    });
  });

  describe.each([
    ['an SSH remote', 'git@gitlab.acme.io:acme/app.git', HOST],
    [
      'an ssh:// remote with a port',
      'ssh://git@gitlab.acme.io:2222/acme/app.git',
      HOST,
    ],
    [
      'a remote carrying a user',
      'https://jdoe@gitlab.acme.io/acme/app.git',
      HOST,
    ],
    [
      'a remote host in another case',
      'https://GitLab.Acme.io/acme/app.git',
      HOST,
    ],
    [
      'a provider URL with a trailing slash',
      HTTPS_REMOTE,
      'https://gitlab.acme.io/',
    ],
    [
      'a provider URL with the default port',
      HTTPS_REMOTE,
      'https://gitlab.acme.io:443',
    ],
    [
      'a provider URL with a path prefix',
      'https://devtools.acme.io/gitlab/acme/app.git',
      'https://devtools.acme.io/gitlab',
    ],
  ])('when the CLI used %s', (_label, remote, providerUrl) => {
    let cliRepo: GitRepo;
    let adopted: GitRepo;

    beforeEach(async () => {
      cliRepo = await recordFromCli({ remote });
      adopted = await addFromApp(await connectTokenProvider(providerUrl));
    });

    it('adopts the same repository', () => {
      expect(adopted.id).toBe(cliRepo.id);
    });
  });

  // Older servers stored the whole ssh:// remote as the provider URL.
  describe('when the ghost connection was stored with a whole ssh:// remote as its URL', () => {
    let ghostRepo: GitRepo;
    let token: GitProvider;
    let adopted: GitRepo;

    beforeEach(async () => {
      ({
        repos: [ghostRepo],
      } = await saveGhost('ssh://git@gitlab.acme.io:2222/acme/app.git', [{}]));
      token = await connectTokenProvider();
      adopted = await addFromApp(token);
    });

    it('adopts the repository', () => {
      expect(adopted).toMatchObject({ id: ghostRepo.id, providerId: token.id });
    });
  });

  describe.each([
    ['a lookalike host', 'https://gitlab.acme.io.evil.com'],
    ['the parent domain', 'https://acme.io'],
    ['a sibling subdomain', 'https://git.acme.io'],
  ])('when the token connection is on %s', (_label, providerUrl) => {
    let cliRepo: GitRepo;
    let token: GitProvider;

    beforeEach(async () => {
      cliRepo = await recordFromCli();
      token = await connectTokenProvider(providerUrl);
    });

    it('refuses the repository as already existing', async () => {
      await expect(addFromApp(token)).rejects.toBeInstanceOf(
        GitRepoAlreadyExistsError,
      );
    });

    it('keeps the CLI repository under its CLI-managed connection', async () => {
      await addFromApp(token).catch(() => undefined);

      expect(await currentProviderOf(cliRepo)).toBe(cliRepo.providerId);
    });
  });

  describe('when two token connections share the host', () => {
    let second: GitProvider;
    let adopted: GitRepo;
    let again: GitRepo;

    beforeEach(async () => {
      await recordFromCli();
      await connectTokenProvider();
      second = await connectTokenProvider();

      adopted = await addFromApp(second);
      again = await recordFromCli();
    });

    it('adopts into the connection the admin picked', () => {
      expect(adopted.providerId).toBe(second.id);
    });

    it('lets the CLI find it under that connection', () => {
      expect(again).toMatchObject({ id: adopted.id, providerId: second.id });
    });
  });

  describe('when the token cannot list repositories on the first CLI run', () => {
    let token: GitProvider;
    let repo: GitRepo;

    beforeEach(async () => {
      token = await connectTokenProvider();
      accessibleRepos.delete(token.id);

      repo = await recordFromCli();
    });

    it('falls back to a CLI-managed connection', () => {
      expect(repo.providerId).not.toBe(token.id);
    });
  });

  describe('when the token has no access to the repository on the first CLI run', () => {
    let token: GitProvider;
    let repo: GitRepo;

    beforeEach(async () => {
      token = await connectTokenProvider(HOST, { accessTo: ['acme/other'] });

      repo = await recordFromCli();
    });

    it('falls back to a CLI-managed connection', () => {
      expect(repo.providerId).not.toBe(token.id);
    });
  });

  describe('when the CLI-managed connection holds other repositories', () => {
    let other: GitRepo;

    beforeEach(async () => {
      await recordFromCli();
      other = await recordFromCli({ repo: 'other' });

      await addFromApp(await connectTokenProvider());
    });

    it('keeps listing the CLI-managed connection', async () => {
      expect(await providerIds()).toContain(other.providerId);
    });

    it('leaves the other repository under it', async () => {
      expect(await currentProviderOf(other)).toBe(other.providerId);
    });
  });

  describe('when the CLI-managed connection holds two branches of the repository', () => {
    let develop: GitRepo;
    let token: GitProvider;

    beforeEach(async () => {
      await recordFromCli();
      develop = await recordFromCli({ branch: 'develop' });

      token = await connectTokenProvider();
      await addFromApp(token);
    });

    it('keeps listing the CLI-managed connection while develop is on it', async () => {
      expect(await providerIds()).toContain(develop.providerId);
    });

    describe('and the CLI runs on develop', () => {
      let developAgain: GitRepo;

      beforeEach(async () => {
        developAgain = await recordFromCli({ branch: 'develop' });
      });

      it('adopts develop too, keeping its id', () => {
        expect(developAgain).toMatchObject({
          id: develop.id,
          providerId: token.id,
        });
      });

      it('no longer lists the CLI-managed connection', async () => {
        expect(await providerIds()).toEqual([token.id]);
      });
    });
  });

  describe('when two CLI-managed connections exist for the host', () => {
    let app: GitRepo;
    let lib: GitRepo;
    let token: GitProvider;

    beforeEach(async () => {
      ({
        repos: [app],
      } = await saveGhost(HOST, [{}]));
      ({
        repos: [lib],
      } = await saveGhost('ssh://git@gitlab.acme.io:2222/acme/lib.git', [
        { repo: 'lib' },
      ]));

      token = await connectTokenProvider(HOST, {
        accessTo: ['acme/app', 'acme/lib'],
      });
      await addFromApp(token);
      await addFromApp(token, { repo: 'lib' });
    });

    it('adopts from each of them', async () => {
      expect([
        await currentProviderOf(app),
        await currentProviderOf(lib),
      ]).toEqual([token.id, token.id]);
    });

    it('no longer lists either of them', async () => {
      expect(await providerIds()).toEqual([token.id]);
    });
  });

  describe('when older servers kept one CLI-managed connection per SSH remote', () => {
    let lib: GitRepo;
    let found: GitRepo;

    beforeEach(async () => {
      await saveGhost('ssh://git@gitlab.acme.io:2222/acme/app.git', [{}]);
      ({
        repos: [lib],
      } = await saveGhost('ssh://git@gitlab.acme.io:2222/acme/lib.git', [
        { repo: 'lib' },
      ]));

      found = await recordFromCli({
        repo: 'lib',
        remote: 'ssh://git@gitlab.acme.io:2222/acme/lib.git',
      });
    });

    it('finds the repository under the connection holding it', () => {
      expect(found.id).toBe(lib.id);
    });
  });

  describe('when the CLI-managed connection belongs to another organization', () => {
    let otherOrgRepo: GitRepo;
    let repo: GitRepo;

    beforeEach(async () => {
      const otherAdmin = new DataFactory(testApp);
      await otherAdmin.withUserAndOrganization({ email: 'other@example.com' });
      otherOrgRepo = await recordFromCli({ by: otherAdmin });

      repo = await addFromApp(await connectTokenProvider());
    });

    it('creates a new repository in this organization', () => {
      expect(repo.id).not.toBe(otherOrgRepo.id);
    });

    it('leaves the other organization repository where it was', async () => {
      expect(await currentProviderOf(otherOrgRepo)).toBe(
        otherOrgRepo.providerId,
      );
    });
  });

  describe('when the instance is installed under a path prefix', () => {
    const PREFIXED_HOST = 'https://devtools.acme.io/gitlab';
    const PREFIXED_REMOTE = 'https://devtools.acme.io/gitlab/acme/app.git';
    // The CLI reads every segment before the repository as the owner.
    const recordPrefixedFromCli = () =>
      recordFromCli({ owner: 'gitlab/acme', remote: PREFIXED_REMOTE });

    describe('and the CLI recorded the repository before the connection', () => {
      let cliRepo: GitRepo;
      let adopted: GitRepo;

      beforeEach(async () => {
        cliRepo = await recordPrefixedFromCli();
        adopted = await addFromApp(await connectTokenProvider(PREFIXED_HOST));
      });

      it('adopts the same repository', () => {
        expect(adopted.id).toBe(cliRepo.id);
      });

      it('records the owner the provider reports', () => {
        expect(adopted.owner).toBe(OWNER);
      });

      it('lets the CLI find it afterwards', async () => {
        expect((await recordPrefixedFromCli()).id).toBe(cliRepo.id);
      });
    });

    describe('and the connection exists before the CLI runs', () => {
      let token: GitProvider;
      let repo: GitRepo;

      beforeEach(async () => {
        token = await connectTokenProvider(PREFIXED_HOST);
        repo = await recordPrefixedFromCli();
      });

      it('creates it under the connection', () => {
        expect(repo).toMatchObject({ providerId: token.id, owner: OWNER });
      });
    });

    describe('and the repository is tracked from the CLI', () => {
      let tracked: GitRepo;

      beforeEach(async () => {
        await connectTokenProvider(PREFIXED_HOST);
        tracked = await testApp.gitHexa.getAdapter().setTrackedRepository({
          ...admin.packmindCommand(),
          owner: 'gitlab/acme',
          repo: REPO,
          branch: BRANCH,
          origin: 'track',
          gitRemoteUrl: PREFIXED_REMOTE,
        });
      });

      it('finds it by the owner the CLI reads', async () => {
        const { gitRepo } = await testApp.gitHexa
          .getAdapter()
          .getTrackedRepository({
            ...admin.packmindCommand(),
            owner: 'gitlab/acme',
            repo: REPO,
          });

        expect(gitRepo?.id).toBe(tracked.id);
      });
    });

    describe('and its group itself starts with the prefix', () => {
      let token: GitProvider;
      let tracked: GitRepo;

      beforeEach(async () => {
        token = await connectTokenProvider(PREFIXED_HOST, {
          accessTo: [`gitlab/${OWNER}/${REPO}`],
        });
        tracked = await testApp.gitHexa.getAdapter().setTrackedRepository({
          ...admin.packmindCommand(),
          owner: `gitlab/gitlab/${OWNER}`,
          repo: REPO,
          branch: BRANCH,
          origin: 'track',
          gitRemoteUrl: `https://devtools.acme.io/gitlab/gitlab/${OWNER}/${REPO}.git`,
        });
      });

      it('tracks it under the connection with the group it reports', () => {
        expect(tracked).toMatchObject({
          providerId: token.id,
          owner: `gitlab/${OWNER}`,
        });
      });
    });

    describe('and the connection URL names the API root', () => {
      let token: GitProvider;
      let repo: GitRepo;

      beforeEach(async () => {
        token = await connectTokenProvider(`${PREFIXED_HOST}/api/v4`);
        repo = await recordPrefixedFromCli();
      });

      it('creates it under the connection', () => {
        expect(repo).toMatchObject({ providerId: token.id, owner: OWNER });
      });
    });

    describe('and the instance also has a group named after the prefix', () => {
      let repo: GitRepo;

      beforeEach(async () => {
        await connectTokenProvider(PREFIXED_HOST, {
          accessTo: [`${OWNER}/${REPO}`, `gitlab/${OWNER}/${REPO}`],
        });
        repo = await recordPrefixedFromCli();
      });

      it('reads the web remote with its prefix removed', () => {
        expect(repo.owner).toBe(OWNER);
      });
    });

    // GitLab leaves its relative URL root out of SSH clone URLs.
    describe('and the remote is an SSH one', () => {
      let token: GitProvider;
      let repo: GitRepo;

      beforeEach(async () => {
        token = await connectTokenProvider(PREFIXED_HOST, {
          accessTo: [`gitlab/${OWNER}/${REPO}`],
        });
        repo = await recordFromCli({
          owner: `gitlab/${OWNER}`,
          remote: `git@devtools.acme.io:gitlab/${OWNER}/${REPO}.git`,
        });
      });

      it('reads its owner as is', () => {
        expect(repo).toMatchObject({
          providerId: token.id,
          owner: `gitlab/${OWNER}`,
        });
      });
    });

    describe('and the tracked branch of a group starting with the prefix moves', () => {
      let token: GitProvider;
      let moved: GitRepo;

      beforeEach(async () => {
        token = await connectTokenProvider(PREFIXED_HOST, {
          accessTo: [`gitlab/${OWNER}/${REPO}`],
        });
        await testApp.gitHexa.getAdapter().setTrackedRepository({
          ...admin.packmindCommand(),
          owner: `gitlab/gitlab/${OWNER}`,
          repo: REPO,
          branch: BRANCH,
          origin: 'track',
          gitRemoteUrl: `https://devtools.acme.io/gitlab/gitlab/${OWNER}/${REPO}.git`,
        });
        moved = await testApp.gitHexa.getAdapter().updateTrackedBranch({
          ...admin.packmindCommand(),
          owner: `gitlab/gitlab/${OWNER}`,
          repo: REPO,
          branch: 'develop',
        });
      });

      it('tracks the new branch under the connection with the same group', () => {
        expect(moved).toMatchObject({
          providerId: token.id,
          owner: `gitlab/${OWNER}`,
          branch: 'develop',
        });
      });
    });

    describe('and another host tracks a repository at the prefixed path', () => {
      let otherHostTracked: GitRepo;
      let token: GitProvider;
      let tracked: GitRepo;

      beforeEach(async () => {
        otherHostTracked = await testApp.gitHexa
          .getAdapter()
          .setTrackedRepository({
            ...admin.packmindCommand(),
            owner: `gitlab/${OWNER}`,
            repo: REPO,
            branch: BRANCH,
            origin: 'track',
            gitRemoteUrl: `https://gitlab.other.io/gitlab/${OWNER}/${REPO}.git`,
          });
        token = await connectTokenProvider(PREFIXED_HOST);
        tracked = await testApp.gitHexa.getAdapter().setTrackedRepository({
          ...admin.packmindCommand(),
          owner: `gitlab/${OWNER}`,
          repo: REPO,
          branch: BRANCH,
          origin: 'track',
          gitRemoteUrl: PREFIXED_REMOTE,
        });
      });

      it('tracks the repository of the remote host', () => {
        expect(tracked).toMatchObject({ providerId: token.id, owner: OWNER });
      });

      it('leaves the other host its tracked repository', () => {
        expect(tracked.id).not.toBe(otherHostTracked.id);
      });
    });

    describe('and another host has a group named after the prefix', () => {
      let tracked: GitRepo;

      beforeEach(async () => {
        await connectTokenProvider(PREFIXED_HOST);
        tracked = await testApp.gitHexa.getAdapter().setTrackedRepository({
          ...admin.packmindCommand(),
          owner: `gitlab/${OWNER}`,
          repo: REPO,
          branch: BRANCH,
          origin: 'track',
          gitRemoteUrl: `https://gitlab.other.io/gitlab/${OWNER}/${REPO}.git`,
        });
      });

      it('keeps the group of the other host', () => {
        expect(tracked.owner).toBe(`gitlab/${OWNER}`);
      });

      it('finds its tracking by that group', async () => {
        const { gitRepo } = await testApp.gitHexa
          .getAdapter()
          .getTrackedRepository({
            ...admin.packmindCommand(),
            owner: `gitlab/${OWNER}`,
            repo: REPO,
          });

        expect(gitRepo?.id).toBe(tracked.id);
      });
    });

    describe('and a connection of another host holds the prefixed group', () => {
      let otherHostRepo: GitRepo;
      let added: GitRepo;

      beforeEach(async () => {
        otherHostRepo = await addFromApp(
          await connectTokenProvider('https://gitlab.other.io', {
            accessTo: [`gitlab/${OWNER}/${REPO}`],
          }),
          { owner: `gitlab/${OWNER}` },
        );
        added = await addFromApp(await connectTokenProvider(PREFIXED_HOST));
      });

      it('adds the repository on the prefixed connection', () => {
        expect(added.owner).toBe(OWNER);
      });

      it('leaves the other connection its repository', async () => {
        expect(await currentProviderOf(otherHostRepo)).toBe(
          otherHostRepo.providerId,
        );
      });
    });
  });

  describe('when the CLI spelled the repository with another case', () => {
    let cliRepo: GitRepo;
    let adopted: GitRepo;

    beforeEach(async () => {
      cliRepo = await recordFromCli({ owner: 'Acme', repo: 'App' });
      adopted = await addFromApp(await connectTokenProvider());
    });

    it('adopts the same repository', () => {
      expect(adopted.id).toBe(cliRepo.id);
    });
  });

  describe('when the repository was tracked with `packmind track`', () => {
    let tracked: GitRepo;

    beforeEach(async () => {
      tracked = await trackFromCli();
      await addFromApp(await connectTokenProvider());
    });

    it('stays tracked after the adoption', async () => {
      const { gitRepo } = await testApp.gitHexa
        .getAdapter()
        .getTrackedRepository({
          ...admin.packmindCommand(),
          owner: OWNER,
          repo: REPO,
        });

      expect(gitRepo?.id).toBe(tracked.id);
    });
  });

  describe('when the connection spells the tracked owner with another case', () => {
    let tracked: GitRepo;

    beforeEach(async () => {
      tracked = await trackFromCli();
      await addFromApp(
        await connectTokenProvider(HOST, { accessTo: [`Acme/${REPO}`] }),
        { owner: 'Acme' },
      );
    });

    it('stays found by the owner the CLI reads', async () => {
      const { gitRepo } = await testApp.gitHexa
        .getAdapter()
        .getTrackedRepository({
          ...admin.packmindCommand(),
          owner: OWNER,
          repo: REPO,
        });

      expect(gitRepo?.id).toBe(tracked.id);
    });
  });

  describe('when its tracking had been removed', () => {
    let tracked: GitRepo;

    beforeEach(async () => {
      tracked = await trackFromCli();
      await distributeTo(tracked);
      await testApp.gitHexa.getAdapter().removeTrackedRepository({
        ...admin.packmindCommand(),
        owner: OWNER,
        repo: REPO,
      });

      await addFromApp(await connectTokenProvider());
    });

    it('shows its history again', async () => {
      expect(await historyRepoIds()).toEqual([tracked.id]);
    });
  });

  describe('when an old CLI sends no remote URL', () => {
    it('still refuses the repository as unresolvable', async () => {
      await expect(
        testApp.gitHexa.getAdapter().findOrCreateGitRepo({
          ...admin.packmindCommand(),
          owner: OWNER,
          repo: REPO,
          branch: BRANCH,
          providerVendor: 'unknown',
        }),
      ).rejects.toBeInstanceOf(UnresolvableGitProviderError);
    });
  });

  describe('when a CLI sends a wrong vendor for the self-hosted remote', () => {
    let token: GitProvider;
    let repo: GitRepo;

    beforeEach(async () => {
      token = await connectTokenProvider();
      repo = await recordFromCli({ providerVendor: 'github' });
    });

    it('resolves by host and uses the token connection', () => {
      expect(repo.providerId).toBe(token.id);
    });
  });
});
