import { OrganizationsSpacesRecipesController } from './recipes.controller';
import { RecipesService } from '../../../recipes/recipes.service';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
import { stubLogger } from '@packmind/test-utils';
import {
  Recipe,
  createRecipeId,
  createRecipeVersionId,
} from '@packmind/recipes';
import { PackmindLogger } from '@packmind/logger';
import { NotFoundException } from '@nestjs/common';
import { AuthenticatedRequest } from '@packmind/node-utils';

describe('OrganizationsSpacesRecipesController', () => {
  let controller: OrganizationsSpacesRecipesController;
  let recipesService: jest.Mocked<RecipesService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    recipesService = {
      getRecipesByOrganization: jest.fn(),
      getRecipesBySpace: jest.fn(),
      getRecipeById: jest.fn(),
      getRecipeVersionsById: jest.fn(),
      updateRecipeFromUI: jest.fn(),
      deleteRecipe: jest.fn(),
    } as unknown as jest.Mocked<RecipesService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesRecipesController(
      recipesService,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecipes', () => {
    it('returns recipes for space within organization', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const mockRecipes: Recipe[] = [
        {
          id: createRecipeId('recipe-1'),
          slug: 'test-recipe',
          name: 'Test Recipe',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        },
      ];
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.getRecipesBySpace.mockResolvedValue(mockRecipes);

      const result = await controller.getRecipes(orgId, spaceId, request);

      expect(result).toEqual(mockRecipes);
      expect(recipesService.getRecipesBySpace).toHaveBeenCalledWith(
        spaceId,
        orgId,
        userId,
      );
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      recipesService.getRecipesBySpace.mockRejectedValue(error);

      await expect(
        controller.getRecipes(orgId, spaceId, request),
      ).rejects.toThrow('Database error');
    });

    it('handles empty recipe list', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.getRecipesBySpace.mockResolvedValue([]);

      const result = await controller.getRecipes(orgId, spaceId, request);

      expect(result).toEqual([]);
      expect(recipesService.getRecipesBySpace).toHaveBeenCalledWith(
        spaceId,
        orgId,
        userId,
      );
    });
  });

  describe('getRecipeById', () => {
    it('returns recipe by ID within space', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const mockRecipe: Recipe = {
        id: recipeId,
        slug: 'test-recipe',
        name: 'Test Recipe',
        content: 'Test content',
        userId,
        version: 1,
        spaceId,
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.getRecipeById.mockResolvedValue(mockRecipe);

      const result = await controller.getRecipeById(
        orgId,
        spaceId,
        recipeId,
        request,
      );

      expect(result).toEqual(mockRecipe);
      expect(recipesService.getRecipeById).toHaveBeenCalledWith(
        recipeId,
        orgId,
        spaceId,
        userId,
      );
    });

    it('throws NotFoundException for non-existent recipe', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.getRecipeById.mockResolvedValue(null);

      await expect(
        controller.getRecipeById(orgId, spaceId, recipeId, request),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      recipesService.getRecipeById.mockRejectedValue(error);

      await expect(
        controller.getRecipeById(orgId, spaceId, recipeId, request),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getRecipeVersionsById', () => {
    it('returns recipe versions within space', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const mockVersions = [
        {
          id: createRecipeVersionId('version-1'),
          recipeId,
          version: 1,
          name: 'Test Recipe v1',
          slug: 'test-recipe',
          content: 'Content v1',
          userId: createUserId('user-1'),
        },
        {
          id: createRecipeVersionId('version-2'),
          recipeId,
          version: 2,
          name: 'Test Recipe v2',
          slug: 'test-recipe',
          content: 'Content v2',
          userId: createUserId('user-1'),
        },
      ];

      recipesService.getRecipeVersionsById.mockResolvedValue(mockVersions);

      const result = await controller.getRecipeVersionsById(
        orgId,
        spaceId,
        recipeId,
      );

      expect(result).toEqual(mockVersions);
      expect(recipesService.getRecipeVersionsById).toHaveBeenCalledWith(
        recipeId,
      );
    });

    it('throws NotFoundException for empty versions list', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');

      recipesService.getRecipeVersionsById.mockResolvedValue([]);

      await expect(
        controller.getRecipeVersionsById(orgId, spaceId, recipeId),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const error = new Error('Database error');

      recipesService.getRecipeVersionsById.mockRejectedValue(error);

      await expect(
        controller.getRecipeVersionsById(orgId, spaceId, recipeId),
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateRecipe', () => {
    it('updates recipe within space and returns updated recipe', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const updateData = {
        name: 'Updated Recipe',
        content: 'Updated content',
      };
      const mockUpdatedRecipe: Recipe = {
        id: recipeId,
        slug: 'test-recipe',
        name: updateData.name,
        content: updateData.content,
        userId,
        version: 2,
        spaceId,
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.updateRecipeFromUI.mockResolvedValue(mockUpdatedRecipe);

      const result = await controller.updateRecipe(
        orgId,
        spaceId,
        recipeId,
        updateData,
        request,
      );

      expect(result).toEqual(mockUpdatedRecipe);
      expect(recipesService.updateRecipeFromUI).toHaveBeenCalledWith(
        recipeId,
        spaceId,
        orgId,
        updateData.name,
        '', // slug (empty string when not provided)
        updateData.content,
        userId,
        undefined, // summary (undefined when not provided)
      );
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const updateData = {
        name: 'Updated Recipe',
        content: 'Updated content',
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      recipesService.updateRecipeFromUI.mockRejectedValue(error);

      await expect(
        controller.updateRecipe(orgId, spaceId, recipeId, updateData, request),
      ).rejects.toThrow('Database error');
    });

    it('validates recipe belongs to specified space', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const updateData = {
        name: 'Updated Recipe',
        content: 'Updated content',
      };
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );

      recipesService.updateRecipeFromUI.mockRejectedValue(error);

      await expect(
        controller.updateRecipe(orgId, spaceId, recipeId, updateData, request),
      ).rejects.toThrow(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );
    });
  });

  describe('deleteRecipe', () => {
    it('deletes recipe within space and returns void', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.deleteRecipe.mockResolvedValue(undefined);

      await controller.deleteRecipe(orgId, spaceId, recipeId, request);

      expect(recipesService.deleteRecipe).toHaveBeenCalledWith(
        recipeId,
        spaceId,
        orgId,
        userId,
      );
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      recipesService.deleteRecipe.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        controller.deleteRecipe(orgId, spaceId, recipeId, request),
      ).rejects.toThrow('Database error');
    });

    it('validates recipe belongs to specified space', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const recipeId = createRecipeId('recipe-1');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );

      recipesService.deleteRecipe.mockRejectedValue(error);

      await expect(
        controller.deleteRecipe(orgId, spaceId, recipeId, request),
      ).rejects.toThrow(
        `Recipe ${recipeId} does not belong to space ${spaceId}`,
      );
    });
  });
});
