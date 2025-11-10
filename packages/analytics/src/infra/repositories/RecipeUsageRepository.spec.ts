import {
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  UserSchema,
} from '@packmind/accounts';
import { TargetSchema } from '@packmind/deployments';
import { targetFactory } from '@packmind/deployments/test';
import {
  GitCommitSchema,
  GitProviderSchema,
  GitRepoSchema,
} from '@packmind/git';
import { gitProviderFactory, gitRepoFactory } from '@packmind/git/test';
import { PackmindLogger } from '@packmind/logger';
import { RecipeSchema, RecipeVersionSchema } from '@packmind/recipes';
import { recipeFactory } from '@packmind/recipes/test';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import {
  itHandlesSoftDelete,
  makeTestDatasource,
  stubLogger,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createRecipeId,
  createTargetId,
  createUserId,
  GitProvider,
  GitRepo,
  Organization,
  Recipe,
  Space,
  Target,
  User,
} from '@packmind/types';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { recipeUsageFactory } from '../../../test';
import { RecipeUsage } from '../../domain/entities/RecipeUsage';
import { RecipeUsageSchema } from '../schemas/RecipeUsageSchema';
import { RecipeUsageRepository } from './RecipeUsageRepository';

describe('RecipeUsageRepository', () => {
  let datasource: DataSource;
  let recipeUsageRepository: RecipeUsageRepository;
  let recipeRepository: Repository<Recipe>;
  let organizationRepository: Repository<Organization>;
  let userRepository: Repository<User>;
  let spaceRepository: Repository<Space>;
  let targetRepository: Repository<Target>;
  let gitRepoRepository: Repository<GitRepo>;
  let gitProviderRepository: Repository<GitProvider>;
  let logger: jest.Mocked<PackmindLogger>;
  let testRecipe: Recipe;
  let testOrganization: Organization;
  let testUser: User;
  let testSpace: Space;
  let testGitProvider: GitProvider;

  beforeEach(async () => {
    logger = stubLogger();
    datasource = await makeTestDatasource([
      RecipeUsageSchema,
      RecipeSchema,
      RecipeVersionSchema,
      OrganizationSchema,
      UserSchema,
      UserOrganizationMembershipSchema,
      SpaceSchema,
      GitRepoSchema,
      GitProviderSchema,
      GitCommitSchema,
      TargetSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    recipeUsageRepository = new RecipeUsageRepository(
      datasource.getRepository<RecipeUsage>(RecipeUsageSchema),
      logger,
    );

    recipeRepository = datasource.getRepository(RecipeSchema);
    organizationRepository = datasource.getRepository(OrganizationSchema);
    userRepository = datasource.getRepository(UserSchema);
    spaceRepository = datasource.getRepository(SpaceSchema);
    targetRepository = datasource.getRepository(TargetSchema);
    gitRepoRepository = datasource.getRepository(GitRepoSchema);
    gitProviderRepository = datasource.getRepository(GitProviderSchema);

    // Create test organization, user, and recipe for foreign key constraints
    testOrganization = await organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: 'Test Organization',
      slug: 'test-organization',
    });

    const userId = createUserId(uuidv4());
    testUser = await userRepository.save({
      id: userId,
      email: 'testuser@packmind.com',
      passwordHash: 'hashed-password',
      active: true,
      memberships: [
        {
          userId,
          organizationId: testOrganization.id,
          role: 'admin',
        },
      ],
    });

    // Create test space
    testSpace = await spaceRepository.save(
      spaceFactory({ organizationId: testOrganization.id }),
    );

    // Create test git provider
    testGitProvider = await gitProviderRepository.save(
      gitProviderFactory({ organizationId: testOrganization.id }),
    );

    testRecipe = await recipeRepository.save(
      recipeFactory({ spaceId: testSpace.id }),
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  itHandlesSoftDelete<RecipeUsage>({
    entityFactory: () =>
      recipeUsageFactory({
        recipeId: testRecipe.id,
        userId: testUser.id,
      }),
    getRepository: () => recipeUsageRepository,
    queryDeletedEntity: async (id) =>
      datasource.getRepository(RecipeUsageSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  it('can store and retrieve recipe usage', async () => {
    const recipeUsage = recipeUsageFactory({
      recipeId: testRecipe.id,
      userId: testUser.id,
    });
    await recipeUsageRepository.add(recipeUsage);

    const usages = await recipeUsageRepository.list();
    expect(usages).toHaveLength(1);
    expect(usages[0]).toMatchObject({
      id: recipeUsage.id,
      recipeId: recipeUsage.recipeId,
      aiAgent: recipeUsage.aiAgent,
      userId: recipeUsage.userId,
    });
  });

  it('can find recipe usage by recipe ID', async () => {
    const recipe1 = await recipeRepository.save(
      recipeFactory({ slug: 'recipe-1', spaceId: testSpace.id }),
    );
    const recipe2 = await recipeRepository.save(
      recipeFactory({ slug: 'recipe-2', spaceId: testSpace.id }),
    );

    const usage1 = recipeUsageFactory({
      recipeId: recipe1.id,
      userId: testUser.id,
    });
    const usage2 = recipeUsageFactory({
      recipeId: recipe1.id,
      userId: testUser.id,
    });
    const usage3 = recipeUsageFactory({
      recipeId: recipe2.id,
      userId: testUser.id,
    });

    await recipeUsageRepository.add(usage1);
    await recipeUsageRepository.add(usage2);
    await recipeUsageRepository.add(usage3);

    const usagesForRecipe1 = await recipeUsageRepository.findByRecipeId(
      recipe1.id,
    );
    expect(usagesForRecipe1).toHaveLength(2);
    expect(usagesForRecipe1.map((u) => u.id)).toContain(usage1.id);
    expect(usagesForRecipe1.map((u) => u.id)).toContain(usage2.id);

    const usagesForRecipe2 = await recipeUsageRepository.findByRecipeId(
      recipe2.id,
    );
    expect(usagesForRecipe2).toHaveLength(1);
    expect(usagesForRecipe2[0].id).toBe(usage3.id);
  });

  it('returns empty array for non-existent recipe ID', async () => {
    const nonExistentRecipeId = createRecipeId(uuidv4());
    const usages =
      await recipeUsageRepository.findByRecipeId(nonExistentRecipeId);
    expect(usages).toEqual([]);
  });

  it('can find recipe usage by target ID', async () => {
    // Create git repositories for the targets
    const gitRepo1 = await gitRepoRepository.save(
      gitRepoFactory({
        providerId: testGitProvider.id,
      }),
    );
    const gitRepo2 = await gitRepoRepository.save(
      gitRepoFactory({
        providerId: testGitProvider.id,
      }),
    );

    const target1 = await targetRepository.save(
      targetFactory({ gitRepoId: gitRepo1.id }),
    );
    const target2 = await targetRepository.save(
      targetFactory({ gitRepoId: gitRepo2.id }),
    );

    const usage1 = recipeUsageFactory({
      recipeId: testRecipe.id,
      userId: testUser.id,
      targetId: target1.id,
    });
    const usage2 = recipeUsageFactory({
      recipeId: testRecipe.id,
      userId: testUser.id,
      targetId: target1.id,
    });
    const usage3 = recipeUsageFactory({
      recipeId: testRecipe.id,
      userId: testUser.id,
      targetId: target2.id,
    });

    await recipeUsageRepository.add(usage1);
    await recipeUsageRepository.add(usage2);
    await recipeUsageRepository.add(usage3);

    const usagesForTarget1 = await recipeUsageRepository.listByTarget(
      target1.id,
    );
    expect(usagesForTarget1).toHaveLength(2);
    expect(usagesForTarget1.map((u) => u.id)).toContain(usage1.id);
    expect(usagesForTarget1.map((u) => u.id)).toContain(usage2.id);

    const usagesForTarget2 = await recipeUsageRepository.listByTarget(
      target2.id,
    );
    expect(usagesForTarget2).toHaveLength(1);
    expect(usagesForTarget2[0].id).toBe(usage3.id);
  });

  it('returns empty array for non-existent target ID', async () => {
    const nonExistentTargetId = createTargetId(uuidv4());
    const usages =
      await recipeUsageRepository.listByTarget(nonExistentTargetId);
    expect(usages).toEqual([]);
  });

  it('returns empty array if target exists but has no usage records', async () => {
    // Create git repository for the target
    const gitRepo = await gitRepoRepository.save(
      gitRepoFactory({
        providerId: testGitProvider.id,
      }),
    );

    const target = await targetRepository.save(
      targetFactory({ gitRepoId: gitRepo.id }),
    );
    const usages = await recipeUsageRepository.listByTarget(target.id);
    expect(usages).toEqual([]);
  });

  it('includes target ID if listing by target', async () => {
    // Create git repository for the target
    const gitRepo = await gitRepoRepository.save(
      gitRepoFactory({
        providerId: testGitProvider.id,
      }),
    );

    const target = await targetRepository.save(
      targetFactory({ gitRepoId: gitRepo.id }),
    );
    const usage = recipeUsageFactory({
      recipeId: testRecipe.id,
      userId: testUser.id,
      targetId: target.id,
    });

    await recipeUsageRepository.add(usage);

    const usages = await recipeUsageRepository.listByTarget(target.id);
    expect(usages).toHaveLength(1);
    expect(usages[0].targetId).toBe(target.id);
  });

  it('can list recipe usage by organization', async () => {
    // Create another organization with its own space
    const org2 = await organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: 'Organization 2',
      slug: 'org-2',
    });
    const space2 = await spaceRepository.save(
      spaceFactory({ organizationId: org2.id }),
    );

    // Create recipes in both organizations
    const recipeOrg1 = await recipeRepository.save(
      recipeFactory({ slug: 'recipe-org-1', spaceId: testSpace.id }),
    );
    const recipeOrg2 = await recipeRepository.save(
      recipeFactory({ slug: 'recipe-org-2', spaceId: space2.id }),
    );

    // Create usage for both organizations
    const usageOrg1 = recipeUsageFactory({
      recipeId: recipeOrg1.id,
      userId: testUser.id,
    });
    const usageOrg2 = recipeUsageFactory({
      recipeId: recipeOrg2.id,
      userId: testUser.id,
    });

    await recipeUsageRepository.add(usageOrg1);
    await recipeUsageRepository.add(usageOrg2);

    // Query for organization 1 should only return its usage
    const usagesOrg1 = await recipeUsageRepository.listByOrganization(
      testOrganization.id,
    );
    expect(usagesOrg1).toHaveLength(1);
    expect(usagesOrg1[0].id).toBe(usageOrg1.id);
    expect(usagesOrg1[0].recipeId).toBe(recipeOrg1.id);

    // Query for organization 2 should only return its usage
    const usagesOrg2 = await recipeUsageRepository.listByOrganization(org2.id);
    expect(usagesOrg2).toHaveLength(1);
    expect(usagesOrg2[0].id).toBe(usageOrg2.id);
  });

  it('returns empty array for organization with no recipe usage', async () => {
    // Create another organization with its own space but no usage
    const org2 = await organizationRepository.save({
      id: createOrganizationId(uuidv4()),
      name: 'Organization Without Usage',
      slug: 'org-without-usage',
    });

    const usages = await recipeUsageRepository.listByOrganization(org2.id);
    expect(usages).toEqual([]);
  });
});
