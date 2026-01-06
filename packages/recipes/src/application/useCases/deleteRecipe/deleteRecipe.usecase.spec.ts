import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  DeleteRecipeCommand,
  OrganizationId,
  Recipe,
  CommandDeletedEvent,
  RecipeId,
  SpaceId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { DeleteRecipeUsecase } from './deleteRecipe.usecase';

describe('DeleteRecipeUsecase', () => {
  let deleteRecipeUsecase: DeleteRecipeUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let recipeVersionService: jest.Mocked<RecipeVersionService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  beforeEach(() => {
    // Mock RecipeService
    recipeService = {
      addRecipe: jest.fn(),
      publishToGit: jest.fn(),
      listRecipesByOrganization: jest.fn(),
      getRecipeById: jest.fn(),
      updateRecipe: jest.fn(),
      findRecipeBySlug: jest.fn(),
      listRecipeVersions: jest.fn(),
      deleteRecipe: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    // Mock RecipeVersionService
    recipeVersionService = {
      addRecipeVersion: jest.fn(),
      listRecipeVersions: jest.fn(),
      getRecipeVersion: jest.fn(),
      getRecipeVersionById: jest.fn(),
      deleteRecipeVersionsForRecipe: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<RecipeVersionService>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubLogger();

    deleteRecipeUsecase = new DeleteRecipeUsecase(
      recipeService,
      recipeVersionService,
      eventEmitterService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let recipeId: RecipeId;
    let userId: UserId;
    let organizationId: OrganizationId;
    let spaceId: SpaceId;
    let command: DeleteRecipeCommand;
    let mockRecipe: Recipe;

    beforeEach(async () => {
      userId = createUserId(uuidv4());
      organizationId = createOrganizationId(uuidv4());
      spaceId = createSpaceId(uuidv4());
      recipeId = createRecipeId(uuidv4());
      mockRecipe = {
        id: recipeId,
        slug: 'test-recipe',
        name: 'Test Recipe',
        content: 'Test content',
        userId,
        version: 1,
        spaceId,
      };
      command = {
        recipeId,
        spaceId,
        userId: userId,
        organizationId: organizationId,
      };
    });

    describe('when recipe deletion succeeds', () => {
      beforeEach(async () => {
        recipeService.getRecipeById.mockResolvedValue(mockRecipe);
        recipeVersionService.deleteRecipeVersionsForRecipe.mockResolvedValue();
        recipeService.deleteRecipe.mockResolvedValue();

        await deleteRecipeUsecase.execute(command);
      });

      it('calls RecipeService.deleteRecipe with correct parameters', () => {
        expect(recipeService.deleteRecipe).toHaveBeenCalledWith(
          recipeId,
          userId,
        );
      });

      it('calls RecipeVersionService.deleteRecipeVersionsForRecipe with correct parameters', () => {
        expect(
          recipeVersionService.deleteRecipeVersionsForRecipe,
        ).toHaveBeenCalledWith(recipeId, userId);
      });

      it('calls RecipeService.deleteRecipe exactly once', () => {
        expect(recipeService.deleteRecipe).toHaveBeenCalledTimes(1);
      });

      it('calls RecipeVersionService.deleteRecipeVersionsForRecipe exactly once', () => {
        expect(
          recipeVersionService.deleteRecipeVersionsForRecipe,
        ).toHaveBeenCalledTimes(1);
      });

      it('deletes recipe before deleting recipe versions', () => {
        const recipeServiceCall =
          recipeService.deleteRecipe.mock.invocationCallOrder[0];
        const versionServiceCall =
          recipeVersionService.deleteRecipeVersionsForRecipe.mock
            .invocationCallOrder[0];
        expect(recipeServiceCall).toBeLessThan(versionServiceCall);
      });

      it('emits RecipeDeletedEvent with correct payload', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(CommandDeletedEvent),
        );
        const emittedEvent = eventEmitterService.emit.mock
          .calls[0][0] as CommandDeletedEvent;
        expect(emittedEvent.payload.id).toBe(recipeId);
        expect(emittedEvent.payload.spaceId).toBe(spaceId);
      });
    });

    describe('when recipe deletion fails', () => {
      let error: Error;

      beforeEach(() => {
        error = new Error('Recipe deletion failed');
        recipeService.getRecipeById.mockResolvedValue(mockRecipe);
        recipeService.deleteRecipe.mockRejectedValue(error);
      });

      it('throws the error from RecipeService', async () => {
        await expect(deleteRecipeUsecase.execute(command)).rejects.toThrow(
          'Recipe deletion failed',
        );
      });

      it('calls RecipeService.deleteRecipe with correct parameters', async () => {
        try {
          await deleteRecipeUsecase.execute(command);
        } catch {
          // Ignore error for this test
        }

        expect(recipeService.deleteRecipe).toHaveBeenCalledWith(
          recipeId,
          userId,
        );
      });

      it('calls RecipeService.deleteRecipe exactly once', async () => {
        try {
          await deleteRecipeUsecase.execute(command);
        } catch {
          // Ignore error for this test
        }

        expect(recipeService.deleteRecipe).toHaveBeenCalledTimes(1);
      });
    });

    describe('when recipe does not exist', () => {
      let nonExistentRecipeId: RecipeId;
      let nonExistentCommand: DeleteRecipeCommand;

      beforeEach(() => {
        nonExistentRecipeId = createRecipeId(uuidv4());
        nonExistentCommand = {
          recipeId: nonExistentRecipeId,
          spaceId,
          userId: userId,
          organizationId: organizationId,
        };
        recipeService.getRecipeById.mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          deleteRecipeUsecase.execute(nonExistentCommand),
        ).rejects.toThrow(`Recipe ${nonExistentRecipeId} not found`);
      });
    });

    describe('when database operation fails', () => {
      let failingCommand: DeleteRecipeCommand;

      beforeEach(() => {
        failingCommand = {
          recipeId,
          spaceId,
          userId: userId,
          organizationId: organizationId,
        };
        recipeService.getRecipeById.mockResolvedValue(mockRecipe);
        recipeService.deleteRecipe.mockRejectedValue(
          new Error('Database connection failed'),
        );
      });

      it('throws an error with the correct message', async () => {
        await expect(
          deleteRecipeUsecase.execute(failingCommand),
        ).rejects.toThrow('Database connection failed');
      });
    });
  });
});
