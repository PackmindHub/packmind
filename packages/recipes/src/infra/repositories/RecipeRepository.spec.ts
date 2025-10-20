import { RecipeRepository } from './RecipeRepository';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { DataSource, Repository } from 'typeorm';
import { itHandlesSoftDelete, makeTestDatasource } from '@packmind/shared/test';
import { recipeFactory } from '../../../test/recipeFactory';
import { createRecipeId, Recipe } from '../../domain/entities/Recipe';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, WithSoftDelete } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId } from '@packmind/accounts';
import { GitCommitSchema } from '@packmind/git';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';

describe('RecipeRepository', () => {
  let datasource: DataSource;
  let recipeRepository: IRecipeRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Recipe>;

  beforeEach(async () => {
    datasource = await makeTestDatasource([
      RecipeSchema,
      RecipeVersionSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(RecipeSchema);

    recipeRepository = new RecipeRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    await datasource.destroy();
  });

  it('can store and retrieve recipes by organization', async () => {
    const recipe = recipeFactory();
    await recipeRepository.add(recipe);

    expect(
      await recipeRepository.findByOrganizationId(recipe.organizationId),
    ).toStrictEqual([recipe]);
  });

  it('can store and retrieve multiple recipes by organization', async () => {
    const organizationId = createOrganizationId(uuidv4());
    await recipeRepository.add(
      recipeFactory({ organizationId, slug: 'recipe-1' }),
    );
    await recipeRepository.add(
      recipeFactory({ organizationId, slug: 'recipe-2' }),
    );
    await recipeRepository.add(
      recipeFactory({ organizationId, slug: 'recipe-3' }),
    );

    expect(
      await recipeRepository.findByOrganizationId(organizationId),
    ).toHaveLength(3);
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
      expect(
        await recipeRepository.findBySlug(recipe.slug, recipe.organizationId),
      ).toEqual(recipe);
    });

    describe('when recipe has been deleted', () => {
      beforeEach(async () => {
        await recipeRepository.deleteById(recipe.id);
      });

      it('can not find a deleted recipe by slug', async () => {
        expect(
          await recipeRepository.findBySlug(recipe.slug, recipe.organizationId),
        ).toBeNull();
      });

      it('can find a deleted recipe by slug if the includeDeleted flag is false', async () => {
        expect(
          await recipeRepository.findBySlug(
            recipe.slug,
            recipe.organizationId,
            {
              includeDeleted: false,
            },
          ),
        ).toBeNull();
      });

      it('can find a deleted recipe by slug if the proper flag is provided', async () => {
        expect(
          await recipeRepository.findBySlug(
            recipe.slug,
            recipe.organizationId,
            {
              includeDeleted: true,
            },
          ),
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
