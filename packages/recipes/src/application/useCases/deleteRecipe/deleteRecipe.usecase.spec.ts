import { DeleteRecipeUsecase } from './deleteRecipe.usecase';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { createRecipeId, RecipeId } from '../../../domain/entities/Recipe';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import {
  createUserId,
  UserId,
  createOrganizationId,
  OrganizationId,
} from '@packmind/accounts';
import { DeleteRecipeCommand } from '../../../domain/useCases/IDeleteRecipeUseCase';

describe('DeleteRecipeUsecase', () => {
  let deleteRecipeUsecase: DeleteRecipeUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let recipeVersionService: jest.Mocked<RecipeVersionService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

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

    stubbedLogger = stubLogger();

    deleteRecipeUsecase = new DeleteRecipeUsecase(
      recipeService,
      recipeVersionService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    let recipeId: RecipeId;
    let userId: UserId;
    let organizationId: OrganizationId;
    let command: DeleteRecipeCommand;

    beforeEach(async () => {
      userId = createUserId(uuidv4());
      organizationId = createOrganizationId(uuidv4());
      recipeId = createRecipeId(uuidv4());
      command = {
        recipeId,
        userId: userId,
        organizationId: organizationId,
      };
    });

    describe('when recipe deletion succeeds', () => {
      beforeEach(async () => {
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
    });

    describe('when recipe deletion fails', () => {
      let error: Error;

      beforeEach(() => {
        error = new Error('Recipe not found');
        recipeService.deleteRecipe.mockRejectedValue(error);
      });

      it('throws the error from RecipeService', async () => {
        await expect(deleteRecipeUsecase.execute(command)).rejects.toThrow(
          'Recipe not found',
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
          userId: userId,
          organizationId: organizationId,
        };
        recipeService.deleteRecipe.mockRejectedValue(
          new Error(`Recipe with id ${nonExistentRecipeId} not found`),
        );
      });

      it('throws an error with the correct message', async () => {
        await expect(
          deleteRecipeUsecase.execute(nonExistentCommand),
        ).rejects.toThrow(`Recipe with id ${nonExistentRecipeId} not found`);
      });
    });

    describe('when database operation fails', () => {
      let failingCommand: DeleteRecipeCommand;

      beforeEach(() => {
        failingCommand = {
          recipeId,
          userId: userId,
          organizationId: organizationId,
        };
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
