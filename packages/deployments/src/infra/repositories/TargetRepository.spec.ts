import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { Repository } from 'typeorm';
import { TargetRepository } from './TargetRepository';
import { TargetSchema } from '../schemas/TargetSchema';
import { GitRepoSchema, GitProviderSchema } from '@packmind/git';
import { OrganizationSchema } from '@packmind/accounts';
import {
  Organization,
  GitProvider,
  GitRepo,
  Target,
  createOrganizationId,
  createTargetId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { targetFactory } from '../../../test';
import { gitProviderFactory, gitRepoFactory } from '@packmind/git/test';

describe('TargetRepository', () => {
  const fixture = createTestDatasourceFixture([
    OrganizationSchema,
    GitProviderSchema,
    GitRepoSchema,
    TargetSchema,
  ]);

  let repository: TargetRepository;
  let organizationRepo: Repository<Organization>;
  let gitProviderRepo: Repository<GitProvider>;
  let gitRepoRepo: Repository<GitRepo>;
  let targetRepo: Repository<Target>;

  const orgAId = createOrganizationId(uuidv4());
  const orgBId = createOrganizationId(uuidv4());
  let softDeleteGitRepoId: GitRepo['id'];

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    repository = new TargetRepository(
      fixture.datasource.getRepository(TargetSchema),
      stubLogger(),
    );

    organizationRepo = fixture.datasource.getRepository(OrganizationSchema);
    gitProviderRepo = fixture.datasource.getRepository(GitProviderSchema);
    gitRepoRepo = fixture.datasource.getRepository(GitRepoSchema);
    targetRepo = fixture.datasource.getRepository(TargetSchema);

    await organizationRepo.save([
      { id: orgAId, name: `Org A ${uuidv4()}`, slug: `org-a-${uuidv4()}` },
      { id: orgBId, name: `Org B ${uuidv4()}`, slug: `org-b-${uuidv4()}` },
    ]);

    const softDeleteProvider = gitProviderFactory({ organizationId: orgAId });
    await gitProviderRepo.save(softDeleteProvider);
    const softDeleteRepo = gitRepoFactory({
      providerId: softDeleteProvider.id,
    });
    await gitRepoRepo.save(softDeleteRepo);
    softDeleteGitRepoId = softDeleteRepo.id;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  const seedTarget = async (organizationId: typeof orgAId) => {
    const provider = gitProviderFactory({
      organizationId,
    });
    await gitProviderRepo.save(provider);

    const repo = gitRepoFactory({ providerId: provider.id });
    await gitRepoRepo.save(repo);

    const target = targetFactory({ gitRepoId: repo.id });
    await targetRepo.save(target);

    return target;
  };

  itHandlesSoftDelete<Target>({
    entityFactory: () => targetFactory({ gitRepoId: softDeleteGitRepoId }),
    getRepository: () => repository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(TargetSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  describe('findByIdsInOrganization', () => {
    describe('when all targets belong to the organization', () => {
      let targetA1: Target;
      let targetA2: Target;
      let result: Target[];

      beforeEach(async () => {
        const provider = gitProviderFactory({ organizationId: orgAId });
        await gitProviderRepo.save(provider);

        const repo = gitRepoFactory({ providerId: provider.id });
        await gitRepoRepo.save(repo);

        targetA1 = targetFactory({ gitRepoId: repo.id, name: 'target-a1' });
        targetA2 = targetFactory({ gitRepoId: repo.id, name: 'target-a2' });
        await targetRepo.save([targetA1, targetA2]);

        result = await repository.findByIdsInOrganization(
          [targetA1.id, targetA2.id],
          orgAId,
        );
      });

      it('returns all matching targets', () => {
        expect(result).toHaveLength(2);
      });

      it('returns targets with correct ids', () => {
        const ids = result.map((t) => t.id).sort();
        expect(ids).toEqual([targetA1.id, targetA2.id].sort());
      });
    });

    describe('when some targets belong to another organization', () => {
      let targetA: Target;
      let targetB: Target;
      let result: Target[];

      beforeEach(async () => {
        targetA = await seedTarget(orgAId);
        targetB = await seedTarget(orgBId);

        result = await repository.findByIdsInOrganization(
          [targetA.id, targetB.id],
          orgAId,
        );
      });

      it('returns only the target belonging to the requested organization', () => {
        expect(result).toHaveLength(1);
      });

      it('returns the correct target', () => {
        expect(result[0].id).toEqual(targetA.id);
      });
    });

    describe('when no targets belong to the organization', () => {
      let targetB: Target;

      it('returns an empty array', async () => {
        targetB = await seedTarget(orgBId);

        const result = await repository.findByIdsInOrganization(
          [targetB.id],
          orgAId,
        );

        expect(result).toEqual([]);
      });
    });

    describe('when targetIds is empty', () => {
      it('returns an empty array without querying the database', async () => {
        const result = await repository.findByIdsInOrganization([], orgAId);

        expect(result).toEqual([]);
      });
    });

    describe('when target ids do not exist', () => {
      it('returns an empty array', async () => {
        const result = await repository.findByIdsInOrganization(
          [createTargetId(uuidv4())],
          orgAId,
        );

        expect(result).toEqual([]);
      });
    });

    describe('when targets span multiple git repos in the same organization', () => {
      let target1: Target;
      let target2: Target;
      let result: Target[];

      beforeEach(async () => {
        const provider = gitProviderFactory({ organizationId: orgAId });
        await gitProviderRepo.save(provider);

        const repo1 = gitRepoFactory({ providerId: provider.id });
        const repo2 = gitRepoFactory({ providerId: provider.id });
        await gitRepoRepo.save([repo1, repo2]);

        target1 = targetFactory({ gitRepoId: repo1.id });
        target2 = targetFactory({ gitRepoId: repo2.id });
        await targetRepo.save([target1, target2]);

        result = await repository.findByIdsInOrganization(
          [target1.id, target2.id],
          orgAId,
        );
      });

      it('returns targets from both repos', () => {
        expect(result).toHaveLength(2);
      });

      it('returns correct target ids', () => {
        const ids = result.map((t) => t.id).sort();
        expect(ids).toEqual([target1.id, target2.id].sort());
      });
    });
  });
});
