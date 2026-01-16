import { NotFoundException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  Recipe,
  createRecipeId,
  createRecipeVersionId,
} from '@packmind/types';
import { RecipesService } from './recipes.service';
import { OrganizationsSpacesRecipesController } from './recipes.controller';

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
    describe('with valid space', () => {
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
      let result: Recipe[];

      beforeEach(async () => {
        recipesService.getRecipesBySpace.mockResolvedValue(mockRecipes);
        result = await controller.getRecipes(orgId, spaceId, request);
      });

      it('returns recipes', () => {
        expect(result).toEqual(mockRecipes);
      });

      it('calls service with correct params', () => {
        expect(recipesService.getRecipesBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
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

    describe('when recipe list is empty', () => {
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
      let result: Recipe[];

      beforeEach(async () => {
        recipesService.getRecipesBySpace.mockResolvedValue([]);
        result = await controller.getRecipes(orgId, spaceId, request);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls service with correct params', () => {
        expect(recipesService.getRecipesBySpace).toHaveBeenCalledWith(
          spaceId,
          orgId,
          userId,
        );
      });
    });
  });

  describe('getRecipeById', () => {
    describe('when recipe exists', () => {
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
      let result: Recipe;

      beforeEach(async () => {
        recipesService.getRecipeById.mockResolvedValue(mockRecipe);
        result = await controller.getRecipeById(
          orgId,
          spaceId,
          recipeId,
          request,
        );
      });

      it('returns recipe', () => {
        expect(result).toEqual(mockRecipe);
      });

      it('calls service with correct params', () => {
        expect(recipesService.getRecipeById).toHaveBeenCalledWith(
          recipeId,
          orgId,
          spaceId,
          userId,
        );
      });
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
    describe('when versions exist', () => {
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
      let result: typeof mockVersions;

      beforeEach(async () => {
        recipesService.getRecipeVersionsById.mockResolvedValue(mockVersions);
        result = await controller.getRecipeVersionsById(
          orgId,
          spaceId,
          recipeId,
        );
      });

      it('returns recipe versions', () => {
        expect(result).toEqual(mockVersions);
      });

      it('calls service with correct params', () => {
        expect(recipesService.getRecipeVersionsById).toHaveBeenCalledWith(
          recipeId,
        );
      });
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
    describe('when update is successful', () => {
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
        clientSource: 'ui',
      } as unknown as AuthenticatedRequest;
      let result: Recipe;

      beforeEach(async () => {
        recipesService.updateRecipeFromUI.mockResolvedValue(mockUpdatedRecipe);
        result = await controller.updateRecipe(
          orgId,
          spaceId,
          recipeId,
          updateData,
          request,
        );
      });

      it('returns updated recipe', () => {
        expect(result).toEqual(mockUpdatedRecipe);
      });

      it('calls service with correct params', () => {
        expect(recipesService.updateRecipeFromUI).toHaveBeenCalledWith({
          recipeId,
          spaceId,
          organizationId: orgId,
          name: updateData.name,
          content: updateData.content,
          userId,
          source: 'ui',
          summary: undefined,
        });
      });
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
        clientSource: 'ui',
      } as unknown as AuthenticatedRequest;

      recipesService.deleteRecipe.mockResolvedValue(undefined);

      await controller.deleteRecipe(orgId, spaceId, recipeId, request);

      expect(recipesService.deleteRecipe).toHaveBeenCalledWith(
        recipeId,
        spaceId,
        orgId,
        userId,
        'ui',
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
