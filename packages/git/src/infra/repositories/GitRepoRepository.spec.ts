import { GitRepoRepository } from './GitRepoRepository';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { GitRepo } from '@packmind/types';
import { GitProvider } from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { gitRepoFactory, gitProviderFactory } from '../../../test';
import { createOrganizationId, Organization } from '@packmind/types';
import { OrganizationSchema } from '@packmind/accounts';

describe('GitRepoRepository', () => {
  let datasource: DataSource;
  let gitRepoRepository: GitRepoRepository;
  let gitProviderRepository: Repository<GitProvider>;
  let organizationRepository: Repository<Organization>;
  let logger: jest.Mocked<PackmindLogger>;
  let testProvider: GitProvider;
  let testOrganization: Organization;

  beforeEach(async () => {
    logger = stubLogger();
    datasource = await makeTestDatasource([
      GitRepoSchema,
      GitProviderSchema,
      OrganizationSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    gitRepoRepository = new GitRepoRepository(
      datasource.getRepository<GitRepo>(GitRepoSchema),
      logger,
    );

    gitProviderRepository = datasource.getRepository(GitProviderSchema);
    organizationRepository = datasource.getRepository(OrganizationSchema);

    // Create test organization and provider for foreign key constraints
    testOrganization = await organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: 'Test Organization',
      slug: 'test-organization',
    });

    testProvider = await gitProviderRepository.save(
      gitProviderFactory({ organizationId: testOrganization.id }),
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  itHandlesSoftDelete<GitRepo>({
    entityFactory: () =>
      gitRepoFactory({
        providerId: testProvider.id,
      }),
    getRepository: () => gitRepoRepository,
    queryDeletedEntity: async (id) =>
      datasource.getRepository(GitRepoSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  it('can store and retrieve git repo', async () => {
    const gitRepo = gitRepoFactory({
      providerId: testProvider.id,
    });
    await gitRepoRepository.add(gitRepo);

    const foundGitRepo = await gitRepoRepository.findById(gitRepo.id);
    expect(foundGitRepo).toMatchObject({
      id: gitRepo.id,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
      branch: gitRepo.branch,
      providerId: gitRepo.providerId,
    });
  });

  it('can find git repo by owner and repo', async () => {
    const gitRepo = gitRepoFactory({
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: testProvider.id,
    });
    await gitRepoRepository.add(gitRepo);

    const foundGitRepo = await gitRepoRepository.findByOwnerAndRepo(
      'test-owner',
      'test-repo',
    );
    expect(foundGitRepo).toMatchObject({
      id: gitRepo.id,
      owner: 'test-owner',
      repo: 'test-repo',
    });
  });

  describe('when a repo has been deleted', () => {
    let gitRepo: GitRepo;

    beforeEach(async () => {
      gitRepo = await gitRepoRepository.add(
        gitRepoFactory({
          providerId: testProvider.id,
        }),
      );
      await gitRepoRepository.deleteById(gitRepo.id);
    });

    it('is not be found with findByOwnerAndRepo', async () => {
      expect(
        await gitRepoRepository.findByOwnerAndRepo(gitRepo.owner, gitRepo.repo),
      ).toBeNull();
    });

    it('can be found with findByOwnerAndRepo if asked to', async () => {
      expect(
        await gitRepoRepository.findByOwnerAndRepo(
          gitRepo.owner,
          gitRepo.repo,
          { includeDeleted: true },
        ),
      ).toMatchObject({
        id: gitRepo.id,
        owner: gitRepo.owner,
        repo: gitRepo.repo,
      });
    });
  });

  it('returns null for non-existent owner and repo', async () => {
    const foundGitRepo = await gitRepoRepository.findByOwnerAndRepo(
      'non-existent-owner',
      'non-existent-repo',
    );
    expect(foundGitRepo).toBeNull();
  });

  describe('findByProviderId', () => {
    let gitRepo1: GitRepo;
    let gitRepo2: GitRepo;
    let foundGitRepos: GitRepo[];

    beforeEach(async () => {
      gitRepo1 = gitRepoFactory({ providerId: testProvider.id });
      gitRepo2 = gitRepoFactory({ providerId: testProvider.id });
      await gitRepoRepository.add(gitRepo1);
      await gitRepoRepository.add(gitRepo2);

      foundGitRepos = await gitRepoRepository.findByProviderId(testProvider.id);
    });

    it('returns all repos for the provider', async () => {
      expect(foundGitRepos).toHaveLength(2);
    });

    it('includes the first repo', async () => {
      expect(foundGitRepos.map((r) => r.id)).toContain(gitRepo1.id);
    });

    it('includes the second repo', async () => {
      expect(foundGitRepos.map((r) => r.id)).toContain(gitRepo2.id);
    });
  });

  describe('findByOrganizationId', () => {
    let gitRepo: GitRepo;
    let foundGitRepos: GitRepo[];

    beforeEach(async () => {
      gitRepo = gitRepoFactory({ providerId: testProvider.id });
      await gitRepoRepository.add(gitRepo);

      foundGitRepos = await gitRepoRepository.findByOrganizationId(
        testOrganization.id,
      );
    });

    it('returns repos for the organization', async () => {
      expect(foundGitRepos).toHaveLength(1);
    });

    it('returns the correct repo data', async () => {
      expect(foundGitRepos[0]).toMatchObject({
        id: gitRepo.id,
        owner: gitRepo.owner,
        repo: gitRepo.repo,
      });
    });
  });

  describe('list', () => {
    let gitRepo1: GitRepo;
    let gitRepo2: GitRepo;
    let allGitRepos: GitRepo[];

    beforeEach(async () => {
      gitRepo1 = gitRepoFactory({ providerId: testProvider.id });
      gitRepo2 = gitRepoFactory({ providerId: testProvider.id });
      await gitRepoRepository.add(gitRepo1);
      await gitRepoRepository.add(gitRepo2);

      allGitRepos = await gitRepoRepository.list();
    });

    it('returns all repos', async () => {
      expect(allGitRepos).toHaveLength(2);
    });

    it('includes the first repo', async () => {
      expect(allGitRepos.map((r) => r.id)).toContain(gitRepo1.id);
    });

    it('includes the second repo', async () => {
      expect(allGitRepos.map((r) => r.id)).toContain(gitRepo2.id);
    });
  });

  describe('list with organization ID', () => {
    let gitRepo: GitRepo;
    let gitReposByOrg: GitRepo[];

    beforeEach(async () => {
      gitRepo = gitRepoFactory({ providerId: testProvider.id });
      await gitRepoRepository.add(gitRepo);

      gitReposByOrg = await gitRepoRepository.list(testOrganization.id);
    });

    it('returns repos for the organization', async () => {
      expect(gitReposByOrg).toHaveLength(1);
    });

    it('returns the correct repo data', async () => {
      expect(gitReposByOrg[0]).toMatchObject({
        id: gitRepo.id,
        owner: gitRepo.owner,
        repo: gitRepo.repo,
      });
    });
  });
});
