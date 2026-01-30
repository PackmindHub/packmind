import { GitCommitSchema } from '@packmind/git';
import { PackmindLogger } from '@packmind/logger';
import { SpaceSchema } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test';
import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import {
  createOrganizationId,
  createRecipeId,
  Recipe,
  WithSoftDelete,
} from '@packmind/types';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { recipeFactory } from '../../../test/recipeFactory';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';
import { RecipeRepository } from './RecipeRepository';

describe('RecipeRepository', () => {
  const fixture = createTestDatasourceFixture([
    RecipeSchema,
    RecipeVersionSchema,
    GitCommitSchema,
    SpaceSchema,
  ]);

  let recipeRepository: IRecipeRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Recipe>;

  beforeAll(() => fixture.initialize());

  beforeEach(() => {
    stubbedLogger = stubLogger();
    typeormRepo = fixture.datasource.getRepository(RecipeSchema);

    recipeRepository = new RecipeRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  it('findByOrganizationId is deprecated and returns empty array', async () => {
    const recipe = recipeFactory();
    await recipeRepository.add(recipe);

    const organizationId = createOrganizationId(uuidv4());
    expect(
      await recipeRepository.findByOrganizationId(organizationId),
    ).toStrictEqual([]);
  });

  it('findByOrganizationId is deprecated - returns empty array even with recipes', async () => {
    const organizationId = createOrganizationId(uuidv4());
    await recipeRepository.add(recipeFactory({ slug: 'recipe-1' }));
    await recipeRepository.add(recipeFactory({ slug: 'recipe-2' }));
    await recipeRepository.add(recipeFactory({ slug: 'recipe-3' }));

    expect(
      await recipeRepository.findByOrganizationId(organizationId),
    ).toHaveLength(0);
  });

  it('can find a recipe by id', async () => {
    const recipe = recipeFactory();
    await recipeRepository.add(recipe);

    const foundRecipe = await recipeRepository.findById(recipe.id);
    expect(foundRecipe).toEqual(recipe);
  });

  describe('when finding a non-existent recipe', () => {
    it('returns null', async () => {
      const foundRecipe = await recipeRepository.findById(
        createRecipeId(uuidv4()),
      );
      expect(foundRecipe).toBeNull();
    });
  });

  describe('findBySlug', () => {
    let recipe: Recipe;

    beforeEach(async () => {
      recipe = await recipeRepository.add(recipeFactory());
    });

    it('can find a recipe by slug and organization', async () => {
      const organizationId = createOrganizationId(uuidv4());
      const space = spaceFactory({ organizationId, id: recipe.spaceId });
      const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
      await spaceRepo.save(space);

      expect(
        await recipeRepository.findBySlug(recipe.slug, organizationId),
      ).toEqual(recipe);
    });

    describe('when recipe has been deleted', () => {
      beforeEach(async () => {
        await recipeRepository.deleteById(recipe.id);
      });

      it('can not find a deleted recipe by slug', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const space = spaceFactory({ organizationId, id: recipe.spaceId });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save(space);

        expect(
          await recipeRepository.findBySlug(recipe.slug, organizationId),
        ).toBeNull();
      });

      it('can find a deleted recipe by slug if the includeDeleted flag is false', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const space = spaceFactory({ organizationId, id: recipe.spaceId });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save(space);

        expect(
          await recipeRepository.findBySlug(recipe.slug, organizationId, {
            includeDeleted: false,
          }),
        ).toBeNull();
      });

      it('can find a deleted recipe by slug if the proper flag is provided', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const space = spaceFactory({ organizationId, id: recipe.spaceId });
        const spaceRepo = fixture.datasource.getRepository(SpaceSchema);
        await spaceRepo.save(space);

        expect(
          await recipeRepository.findBySlug(recipe.slug, organizationId, {
            includeDeleted: true,
          }),
        ).toMatchObject({ id: recipe.id, name: recipe.name });
      });
    });
  });

  itHandlesSoftDelete<Recipe>({
    entityFactory: recipeFactory,
    getRepository: () => recipeRepository,
    queryDeletedEntity: async (id) =>
      typeormRepo.findOne({
        where: { id },
        withDeleted: true,
      }) as unknown as WithSoftDelete<Recipe>,
  });
});
