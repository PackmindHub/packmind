import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RecipesHexa } from '@packmind/recipes';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { DeploymentsHexa } from '@packmind/deployments';

describe('RecipesController', () => {
  let app: TestingModule;
  let recipesController: RecipesController;

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
      setDeploymentPort: jest.fn().mockResolvedValue(undefined),
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
            setRecipesPort: jest.fn(),
          },
        },
        {
          provide: PackmindLogger,
          useValue: stubLogger(),
        },
      ],
    }).compile();

    recipesController = app.get<RecipesController>(RecipesController);
  });

  describe('controller initialization', () => {
    it('is defined', () => {
      expect(recipesController).toBeDefined();
    });
  });
});
