import { GitRepoRepository } from './GitRepoRepository';
import { GitRepoSchema } from '../schemas/GitRepoSchema';
import { GitProviderSchema } from '../schemas/GitProviderSchema';
import { DataSource, Repository } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { itHandlesSoftDelete } from '@packmind/shared/test';
import { v4 as uuidv4 } from 'uuid';
import { GitRepo } from '../../domain/entities/GitRepo';
import { GitProvider } from '../../domain/entities/GitProvider';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { gitRepoFactory, gitProviderFactory } from '../../../test';
import {
  createOrganizationId,
  OrganizationSchema,
  Organization,
} from '@packmind/accounts';

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

  it('can find git repos by provider ID', async () => {
    const gitRepo1 = gitRepoFactory({ providerId: testProvider.id });
    const gitRepo2 = gitRepoFactory({ providerId: testProvider.id });
    await gitRepoRepository.add(gitRepo1);
    await gitRepoRepository.add(gitRepo2);

    const foundGitRepos = await gitRepoRepository.findByProviderId(
      testProvider.id,
    );
    expect(foundGitRepos).toHaveLength(2);
    expect(foundGitRepos.map((r) => r.id)).toContain(gitRepo1.id);
    expect(foundGitRepos.map((r) => r.id)).toContain(gitRepo2.id);
  });

  it('can find git repos by organization ID', async () => {
    const gitRepo = gitRepoFactory({ providerId: testProvider.id });
    await gitRepoRepository.add(gitRepo);

    const foundGitRepos = await gitRepoRepository.findByOrganizationId(
      testOrganization.id,
    );
    expect(foundGitRepos).toHaveLength(1);
    expect(foundGitRepos[0]).toMatchObject({
      id: gitRepo.id,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
    });
  });

  it('can list all git repos', async () => {
    const gitRepo1 = gitRepoFactory({ providerId: testProvider.id });
    const gitRepo2 = gitRepoFactory({ providerId: testProvider.id });
    await gitRepoRepository.add(gitRepo1);
    await gitRepoRepository.add(gitRepo2);

    const allGitRepos = await gitRepoRepository.list();
    expect(allGitRepos).toHaveLength(2);
    expect(allGitRepos.map((r) => r.id)).toContain(gitRepo1.id);
    expect(allGitRepos.map((r) => r.id)).toContain(gitRepo2.id);
  });

  it('can list git repos by organization ID', async () => {
    const gitRepo = gitRepoFactory({ providerId: testProvider.id });
    await gitRepoRepository.add(gitRepo);

    const gitReposByOrg = await gitRepoRepository.list(testOrganization.id);
    expect(gitReposByOrg).toHaveLength(1);
    expect(gitReposByOrg[0]).toMatchObject({
      id: gitRepo.id,
      owner: gitRepo.owner,
      repo: gitRepo.repo,
    });
  });
});
