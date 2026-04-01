import {
  IRecipesPort,
  Recipe,
  RecipeVersion,
  createRecipeId,
  createRecipeVersionId,
  createUserId,
  createOrganizationId,
  createSpaceId,
  DiffService,
} from '@packmind/types';
import { CommandChangesApplier } from './CommandChangesApplier';

describe('CommandChangesApplier', () => {
  let applier: CommandChangesApplier;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let diffService: DiffService;

  const recipeId = createRecipeId('recipe-1');
  const versionId = createRecipeVersionId('ver-1');
  const userId = createUserId('user-1');
  const orgId = createOrganizationId('org-1');
  const spaceId = createSpaceId('space-1');

  const recipe: Recipe = {
    id: recipeId,
    name: 'My Command',
    slug: 'my-command',
    version: 1,
    spaceId,
    organizationId: orgId,
  } as Recipe;

  const version: RecipeVersion = {
    id: versionId,
    recipeId,
    name: 'My Command',
    slug: 'my-command',
    content: 'Do this thing',
    version: 1,
    userId,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    diffService = new DiffService();

    recipesPort = {
      getRecipeByIdInternal: jest.fn(),
      getRecipeVersion: jest.fn(),
      updateRecipeFromUI: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    applier = new CommandChangesApplier(diffService, recipesPort);
  });

  describe('getVersion', () => {
    describe('when recipe and version exist', () => {
      beforeEach(() => {
        recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
        recipesPort.getRecipeVersion.mockResolvedValue(version);
      });

      it('returns the recipe version', async () => {
        const result = await applier.getVersion(recipeId);

        expect(result).toEqual(version);
      });

      it('fetches recipe by internal id', async () => {
        await applier.getVersion(recipeId);

        expect(recipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId,
        );
      });

      it('fetches the version with correct parameters', async () => {
        await applier.getVersion(recipeId);

        expect(recipesPort.getRecipeVersion).toHaveBeenCalledWith(
          recipe.id,
          recipe.version,
          [recipe.spaceId],
        );
      });
    });

    describe('when recipe does not exist', () => {
      beforeEach(() => {
        recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(applier.getVersion(recipeId)).rejects.toThrow(
          `Recipe not found for ${recipeId}`,
        );
      });
    });

    describe('when version does not exist', () => {
      beforeEach(() => {
        recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
        recipesPort.getRecipeVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(applier.getVersion(recipeId)).rejects.toThrow(
          `Recipe version not found for ${recipeId}`,
        );
      });
    });
  });

  describe('saveNewVersion', () => {
    const newVersionId = createRecipeVersionId('ver-2');
    const updatedRecipe = { ...recipe, version: 2 } as Recipe;
    const newVersion: RecipeVersion = {
      ...version,
      id: newVersionId,
      version: 2,
    };

    describe('when update succeeds', () => {
      beforeEach(() => {
        recipesPort.updateRecipeFromUI.mockResolvedValue({
          recipe: updatedRecipe,
        });
        recipesPort.getRecipeVersion.mockResolvedValue(newVersion);
      });

      it('returns the new version', async () => {
        const result = await applier.saveNewVersion(
          version,
          userId,
          spaceId,
          orgId,
        );

        expect(result).toEqual(newVersion);
      });

      it('calls updateRecipeFromUI with mapped fields', async () => {
        await applier.saveNewVersion(version, userId, spaceId, orgId);

        expect(recipesPort.updateRecipeFromUI).toHaveBeenCalledWith({
          recipeId: version.recipeId,
          name: version.name,
          content: version.content,
          userId,
          spaceId,
          organizationId: orgId,
        });
      });
    });

    describe('when fetching new version fails', () => {
      beforeEach(() => {
        recipesPort.updateRecipeFromUI.mockResolvedValue({
          recipe: updatedRecipe,
        });
        recipesPort.getRecipeVersion.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(
          applier.saveNewVersion(version, userId, spaceId, orgId),
        ).rejects.toThrow(
          `Failed to retrieve new version after updating recipe ${recipeId}`,
        );
      });
    });
  });
});
