import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { Recipe, RecipesHexa } from '@packmind/recipes';
import { recipeFactory } from '@packmind/recipes/test';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { DeploymentsHexa } from '@packmind/deployments';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '@packmind/shared-nest';

describe('RecipesController', () => {
  let app: TestingModule;
  let recipesController: RecipesController;
  let recipesService: RecipesService;

  const mockAuthenticatedRequest: AuthenticatedRequest = {
    user: {
      name: 'testuser',
      userId: createUserId(uuidv4()),
    },
    organization: {
      id: createOrganizationId(uuidv4()),
      name: 'Test Organization',
      slug: 'test-organization',
    },
  } as AuthenticatedRequest;

  beforeAll(async () => {
    const mockRecipesHexa = {
      listRecipesByOrganization: jest.fn(),
      getRecipeById: jest.fn(),
      captureRecipe: jest.fn(),
      updateRecipesFromGit: jest.fn(),
      listRecipeVersions: jest.fn(),
      publishRecipeToGit: jest.fn(),
      deleteRecipe: jest.fn(),
      deleteRecipesBatch: jest.fn(),
      getUsageByOrganization: jest.fn(),
      listDeploymentsByRecipe: jest.fn(),
    };

    app = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'fallback-secret-for-development',
          signOptions: {
            expiresIn: '30d',
            issuer: 'packmind',
          },
        }),
      ],
      controllers: [RecipesController],
      providers: [
        RecipesService,
        {
          provide: AuthService,
          useValue: {
            signUp: jest.fn(),
            signIn: jest.fn(),
          },
        },
        {
          provide: RecipesHexa,
          useValue: mockRecipesHexa,
        },
        {
          provide: DeploymentsHexa,
          useValue: {
            publishRecipes: jest.fn(),
            getDeploymentsUseCases: jest.fn(),
          },
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    recipesController = app.get<RecipesController>(RecipesController);
    recipesService = app.get<RecipesService>(RecipesService);
  });

  describe('getRecipes', () => {
    it('returns an array of recipes', async () => {
      const result: Recipe[] = [recipeFactory(), recipeFactory()];
      jest
        .spyOn(recipesService, 'getRecipesByOrganization')
        .mockImplementation(async () => result);

      expect(await recipesController.getRecipes(mockAuthenticatedRequest)).toBe(
        result,
      );
    });
  });

  describe('addRecipe', () => {
    it('adds a recipe', async () => {
      const recipe: Recipe = recipeFactory();
      const testUserId = createUserId(uuidv4());

      const addRecipeSpy = jest
        .spyOn(recipesService, 'addRecipe')
        .mockImplementation(async () => recipe);

      const result = await recipesController.addRecipe(
        {
          name: 'My recipe',
          slug: '/my-recipe',
          content: 'My recipe',
          userId: testUserId,
        },
        mockAuthenticatedRequest,
      );

      expect(addRecipeSpy).toHaveBeenCalledWith(
        {
          name: 'My recipe',
          slug: '/my-recipe',
          content: 'My recipe',
          userId: testUserId,
        },
        mockAuthenticatedRequest.organization.id,
        mockAuthenticatedRequest.user.userId,
      );
      expect(result).toEqual(recipe);
    });
  });
});
