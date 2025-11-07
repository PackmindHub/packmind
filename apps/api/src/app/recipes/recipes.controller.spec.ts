import { Test, TestingModule } from '@nestjs/testing';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { AuthService } from '../auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { IRecipesPort, IDeploymentPort } from '@packmind/types';
import {
  RECIPES_ADAPTER_TOKEN,
  DEPLOYMENT_ADAPTER_TOKEN,
} from '../shared/HexaRegistryModule';

describe('RecipesController', () => {
  let app: TestingModule;
  let recipesController: RecipesController;

  beforeAll(async () => {
    const mockRecipesAdapter: Partial<IRecipesPort> = {
      listRecipesByOrganization: jest.fn(),
      getRecipeById: jest.fn(),
      captureRecipe: jest.fn(),
      updateRecipesFromGitHub: jest.fn(),
      updateRecipesFromGitLab: jest.fn(),
      updateRecipeFromUI: jest.fn(),
      listRecipeVersions: jest.fn(),
      deleteRecipe: jest.fn(),
      deleteRecipesBatch: jest.fn(),
      listRecipesBySpace: jest.fn(),
    };

    const mockDeploymentAdapter: Partial<IDeploymentPort> = {
      publishRecipes: jest.fn(),
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
          provide: RECIPES_ADAPTER_TOKEN,
          useValue: mockRecipesAdapter,
        },
        {
          provide: DEPLOYMENT_ADAPTER_TOKEN,
          useValue: mockDeploymentAdapter,
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
