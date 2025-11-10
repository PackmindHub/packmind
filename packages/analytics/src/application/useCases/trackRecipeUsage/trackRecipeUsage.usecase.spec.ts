import { recipeFactory } from '@packmind/recipes/test';
import { stubLogger } from '@packmind/test-utils';
import {
  GitRepo,
  IGitPort,
  IRecipesPort,
  createGitProviderId,
  createGitRepoId,
  createRecipeId,
  createUserId,
} from '@packmind/types';
import {
  RecipeUsage,
  createRecipeUsageId,
} from '../../../domain/entities/RecipeUsage';
import { RecipeUsageService } from '../../services/RecipeUsageService';
import { TrackRecipeUsageUsecase } from './trackRecipeUsage.usecase';

describe('TrackRecipeUsageUsecase', () => {
  let usecase: TrackRecipeUsageUsecase;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockRecipeUsageService: jest.Mocked<RecipeUsageService>;
  let mockGitPort: jest.Mocked<IGitPort>;

  beforeEach(() => {
    mockRecipesPort = {
      findRecipeBySlug: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockRecipeUsageService = {
      trackRecipeUsage: jest.fn(),
      getUsageByRecipeId: jest.fn(),
    } as unknown as jest.Mocked<RecipeUsageService>;

    mockGitPort = {
      findGitRepoByOwnerAndRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    usecase = new TrackRecipeUsageUsecase(
      mockRecipesPort,
      mockRecipeUsageService,
      mockGitPort,
      undefined, // deploymentPort is optional
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackRecipeUsage', () => {
    const testUserId = createUserId('user-123');
    const testRecipeId = createRecipeId('recipe-123');
    const testGitRepoId = createGitRepoId('repo-123');
    const testRecipe = recipeFactory({
      id: testRecipeId,
      slug: 'test-recipe-slug',
      name: 'Test Recipe',
      userId: testUserId,
    });
    const testUsage: RecipeUsage = {
      id: createRecipeUsageId('usage-123'),
      recipeId: testRecipeId,
      aiAgent: 'Cursor',
      usedAt: new Date(),
      userId: testUserId,
      gitRepoId: testGitRepoId,
      targetId: null,
    };

    const gitRepoString = 'owner/repository';

    it('tracks usage for deleted recipes too', async () => {
      const recipeSlugs = ['test-recipe-slug'];
      const aiAgent = 'Cursor';

      mockRecipesPort.findRecipeBySlug.mockResolvedValue(testRecipe);
      mockRecipeUsageService.trackRecipeUsage.mockResolvedValue(testUsage);

      mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue({
        id: testGitRepoId,
        owner: 'owner',
        repo: 'repository',
        branch: 'main',
        providerId: createGitProviderId('provider-123'),
      });

      await usecase.execute({
        recipeSlugs,
        aiAgent,
        gitRepo: gitRepoString,
        userId: testUserId,
        organizationId: 'org-123',
      });

      expect(mockRecipesPort.findRecipeBySlug).toHaveBeenCalledWith(
        'test-recipe-slug',
        'org-123',
        { includeDeleted: true },
      );
    });

    it('tracks usage for multiple recipe slugs', async () => {
      const recipeSlugs = ['recipe-1', 'recipe-2', 'recipe-3'];
      const aiAgent = 'Claude Code';

      const recipes = recipeSlugs.map((slug, index) => ({
        ...testRecipe,
        id: createRecipeId(`recipe-${index + 1}`),
        slug,
      }));

      const usageRecords = recipes.map((recipe, index) => ({
        ...testUsage,
        id: createRecipeUsageId(`usage-${index + 1}`),
        recipeId: recipe.id,
      }));

      mockRecipesPort.findRecipeBySlug
        .mockResolvedValueOnce(recipes[0])
        .mockResolvedValueOnce(recipes[1])
        .mockResolvedValueOnce(recipes[2]);

      mockRecipeUsageService.trackRecipeUsage
        .mockResolvedValueOnce(usageRecords[0])
        .mockResolvedValueOnce(usageRecords[1])
        .mockResolvedValueOnce(usageRecords[2]);

      mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue({
        id: testGitRepoId,
        owner: 'owner',
        repo: 'repository',
        branch: 'main',
        providerId: createGitProviderId('provider-123'),
      });

      const result = await usecase.execute({
        recipeSlugs,
        aiAgent,
        gitRepo: gitRepoString,
        userId: testUserId,
        organizationId: 'org-123',
      });

      expect(mockRecipesPort.findRecipeBySlug).toHaveBeenCalledTimes(3);
      expect(mockRecipeUsageService.trackRecipeUsage).toHaveBeenCalledTimes(3);
      expect(result).toEqual(usageRecords);
    });

    describe('when gitRepo is provided', () => {
      const testGitRepo: GitRepo = {
        id: testGitRepoId,
        owner: 'owner',
        repo: 'repository',
        branch: 'main',
        providerId: createGitProviderId('provider-123'),
      };

      it('tracks usage with valid git repo', async () => {
        const recipeSlugs = ['test-recipe-slug'];
        const aiAgent = 'GitHub Copilot';

        mockRecipesPort.findRecipeBySlug.mockResolvedValue(testRecipe);
        mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue(testGitRepo);
        mockRecipeUsageService.trackRecipeUsage.mockResolvedValue(testUsage);

        const result = await usecase.execute({
          recipeSlugs,
          aiAgent,
          userId: testUserId as unknown as string,
          organizationId: 'org-123',
          gitRepo: gitRepoString,
        });

        expect(mockGitPort.findGitRepoByOwnerAndRepo).toHaveBeenCalledWith(
          'owner',
          'repository',
        );
        expect(mockRecipeUsageService.trackRecipeUsage).toHaveBeenCalledWith({
          recipeId: testRecipeId,
          aiAgent,
          gitRepoId: testGitRepoId,
          userId: testUserId,
          targetId: null,
        });
        expect(result).toEqual([testUsage]);
      });

      it('throws error for invalid git repo format', async () => {
        const invalidGitRepo = 'invalid-format';

        await expect(
          usecase.execute({
            recipeSlugs: ['test-recipe-slug'],
            aiAgent: 'Cursor',
            userId: testUserId as unknown as string,
            organizationId: 'org-123',
            gitRepo: invalidGitRepo,
          }),
        ).rejects.toThrow(
          'Invalid gitRepo format: "invalid-format". Expected format: "owner/repo" or "owner/subowner/.../repo"',
        );

        expect(mockGitPort.findGitRepoByOwnerAndRepo).not.toHaveBeenCalled();
        expect(mockRecipesPort.findRecipeBySlug).not.toHaveBeenCalled();
        expect(mockRecipeUsageService.trackRecipeUsage).not.toHaveBeenCalled();
      });

      it('handles multi-level git repo format', async () => {
        const multiLevelGitRepo = 'promyze/sandbox/protomind';
        const recipeSlugs = ['test-recipe-slug'];
        const aiAgent = 'Cursor';

        mockRecipesPort.findRecipeBySlug.mockResolvedValue(testRecipe);
        mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue({
          id: testGitRepoId,
          owner: 'promyze/sandbox',
          repo: 'protomind',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        });
        mockRecipeUsageService.trackRecipeUsage.mockResolvedValue(testUsage);

        const result = await usecase.execute({
          recipeSlugs,
          aiAgent,
          userId: testUserId as unknown as string,
          organizationId: 'org-123',
          gitRepo: multiLevelGitRepo,
        });

        expect(mockGitPort.findGitRepoByOwnerAndRepo).toHaveBeenCalledWith(
          'promyze/sandbox',
          'protomind',
        );
        expect(result).toEqual([testUsage]);
      });

      it('throws error for git repo ending with slash', async () => {
        const invalidGitRepo = 'owner/repo/';

        await expect(
          usecase.execute({
            recipeSlugs: ['test-recipe-slug'],
            aiAgent: 'Cursor',
            userId: testUserId as unknown as string,
            organizationId: 'org-123',
            gitRepo: invalidGitRepo,
          }),
        ).rejects.toThrow(
          'Invalid gitRepo format: "owner/repo/". Expected format: "owner/repo" or "owner/subowner/.../repo"',
        );

        expect(mockGitPort.findGitRepoByOwnerAndRepo).not.toHaveBeenCalled();
        expect(mockRecipesPort.findRecipeBySlug).not.toHaveBeenCalled();
        expect(mockRecipeUsageService.trackRecipeUsage).not.toHaveBeenCalled();
      });

      it('throws error if git repo does not exist', async () => {
        mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue(null);

        await expect(
          usecase.execute({
            recipeSlugs: ['test-recipe-slug'],
            aiAgent: 'Cursor',
            userId: testUserId as unknown as string,
            organizationId: 'org-123',
            gitRepo: gitRepoString,
          }),
        ).rejects.toThrow(
          'GitRepo "owner/repository" not found in database. Please ensure the repository is properly configured.',
        );

        expect(mockRecipesPort.findRecipeBySlug).not.toHaveBeenCalled();
        expect(mockRecipeUsageService.trackRecipeUsage).not.toHaveBeenCalled();
      });
    });

    describe('when recipe is not found', () => {
      it('skips missing recipes and continues with others', async () => {
        const recipeSlugs = [
          'existing-recipe',
          'missing-recipe',
          'another-recipe',
        ];
        const aiAgent = 'Cursor';

        const existingRecipe = { ...testRecipe, slug: 'existing-recipe' };
        const anotherRecipe = {
          ...testRecipe,
          id: createRecipeId('recipe-456'),
          slug: 'another-recipe',
        };
        const usage1 = { ...testUsage, recipeId: existingRecipe.id };
        const usage2 = {
          ...testUsage,
          id: createRecipeUsageId('usage-456'),
          recipeId: anotherRecipe.id,
        };

        mockRecipesPort.findRecipeBySlug
          .mockResolvedValueOnce(existingRecipe)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(anotherRecipe);

        mockRecipeUsageService.trackRecipeUsage
          .mockResolvedValueOnce(usage1)
          .mockResolvedValueOnce(usage2);

        mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue({
          id: testGitRepoId,
          owner: 'owner',
          repo: 'repository',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        });

        const result = await usecase.execute({
          recipeSlugs,
          aiAgent,
          gitRepo: gitRepoString,
          userId: testUserId,
          organizationId: 'org-123',
        });

        expect(mockRecipesPort.findRecipeBySlug).toHaveBeenCalledTimes(3);
        expect(mockRecipeUsageService.trackRecipeUsage).toHaveBeenCalledTimes(
          2,
        );
        expect(result).toEqual([usage1, usage2]);
      });
    });

    describe('when trackRecipeUsage service fails', () => {
      it('continues processing other recipes if one fails', async () => {
        const recipeSlugs = ['recipe-1', 'recipe-2'];
        const aiAgent = 'Cursor';

        const recipe1 = { ...testRecipe, slug: 'recipe-1' };
        const recipe2 = {
          ...testRecipe,
          id: createRecipeId('recipe-2'),
          slug: 'recipe-2',
        };
        const usage2 = {
          ...testUsage,
          id: createRecipeUsageId('usage-2'),
          recipeId: recipe2.id,
        };

        mockRecipesPort.findRecipeBySlug
          .mockResolvedValueOnce(recipe1)
          .mockResolvedValueOnce(recipe2);

        mockRecipeUsageService.trackRecipeUsage
          .mockRejectedValueOnce(new Error('Database error'))
          .mockResolvedValueOnce(usage2);

        mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue({
          id: testGitRepoId,
          owner: 'owner',
          repo: 'repository',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        });

        const result = await usecase.execute({
          recipeSlugs,
          aiAgent,
          gitRepo: gitRepoString,
          userId: testUserId,
          organizationId: 'org-123',
        });

        expect(mockRecipesPort.findRecipeBySlug).toHaveBeenCalledTimes(2);
        expect(mockRecipeUsageService.trackRecipeUsage).toHaveBeenCalledTimes(
          2,
        );
        expect(result).toEqual([usage2]);
      });
    });

    describe('when empty slug array is provided', () => {
      it('returns empty array', async () => {
        mockGitPort.findGitRepoByOwnerAndRepo.mockResolvedValue({
          id: testGitRepoId,
          owner: 'owner',
          repo: 'repository',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        });

        const result = await usecase.execute({
          recipeSlugs: [],
          aiAgent: 'Cursor',
          gitRepo: gitRepoString,
          userId: testUserId,
          organizationId: 'org-123',
        });

        expect(mockRecipesPort.findRecipeBySlug).not.toHaveBeenCalled();
        expect(mockRecipeUsageService.trackRecipeUsage).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });
  });

  describe('getUsageByRecipeId', () => {
    const testRecipeId = createRecipeId('recipe-123');

    it('returns usage records for recipe', async () => {
      const mockUsage: RecipeUsage = {
        id: createRecipeUsageId('usage-1'),
        recipeId: testRecipeId,
        aiAgent: 'Cursor',
        usedAt: new Date(),
        userId: createUserId('user-1'),
        gitRepoId: createGitRepoId('repo-1'),
        targetId: null,
      };

      mockRecipeUsageService.getUsageByRecipeId.mockResolvedValue([mockUsage]);

      const result = await usecase.getUsageByRecipeId(testRecipeId);

      expect(mockRecipeUsageService.getUsageByRecipeId).toHaveBeenCalledWith(
        testRecipeId,
      );
      expect(result).toEqual([mockUsage]);
    });

    describe('when no usage records exist', () => {
      it('returns empty array', async () => {
        mockRecipeUsageService.getUsageByRecipeId.mockResolvedValue([]);

        const result = await usecase.getUsageByRecipeId(testRecipeId);

        expect(mockRecipeUsageService.getUsageByRecipeId).toHaveBeenCalledWith(
          testRecipeId,
        );
        expect(result).toEqual([]);
      });
    });

    describe('when service fails', () => {
      it('throws error', async () => {
        const error = new Error('Database connection failed');
        mockRecipeUsageService.getUsageByRecipeId.mockRejectedValue(error);

        await expect(usecase.getUsageByRecipeId(testRecipeId)).rejects.toThrow(
          'Database connection failed',
        );

        expect(mockRecipeUsageService.getUsageByRecipeId).toHaveBeenCalledWith(
          testRecipeId,
        );
      });
    });
  });
});
