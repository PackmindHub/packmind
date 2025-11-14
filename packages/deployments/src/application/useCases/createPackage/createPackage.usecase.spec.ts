import { CreatePackageUsecase } from './createPackage.usecase';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  createRecipeId,
  createStandardId,
  IAccountsPort,
  ISpacesPort,
  IRecipesPort,
  IStandardsPort,
  CreatePackageCommand,
  Space,
  Recipe,
  Standard,
  RecipeId,
  StandardId,
  SpaceId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { v4 as uuidv4 } from 'uuid';

describe('CreatePackageUsecase', () => {
  let useCase: CreatePackageUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const recipeId1 = createRecipeId(uuidv4());
  const recipeId2 = createRecipeId(uuidv4());
  const standardId1 = createStandardId(uuidv4());
  const standardId2 = createStandardId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    active: true,
    memberships: [
      {
        userId,
        organizationId,
        role: 'member' as const,
      },
    ],
  });

  const buildOrganization = () => ({
    id: organizationId,
    name: 'Test Organization',
    slug: 'test-org',
  });

  const buildSpace = (): Space => ({
    id: spaceId,
    slug: 'test-space',
    name: 'Test Space',
    organizationId,
  });

  const buildRecipe = (id: RecipeId, spaceIdParam: SpaceId): Recipe => ({
    id,
    name: `Recipe ${id}`,
    slug: `recipe-${id}`,
    content: 'Test recipe content',
    version: 1,
    userId,
    spaceId: spaceIdParam,
  });

  const buildStandard = (id: StandardId, spaceIdParam: SpaceId): Standard => ({
    id,
    name: `Standard ${id}`,
    slug: `standard-${id}`,
    description: 'Test standard',
    version: 1,
    userId,
    scope: null,
    spaceId: spaceIdParam,
  });

  beforeEach(() => {
    mockPackageService = {
      createPackage: jest.fn(),
      findById: jest.fn(),
      getPackagesBySpaceId: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockServices = {
      getPackageService: jest.fn().mockReturnValue(mockPackageService),
      getTargetService: jest.fn(),
      getRenderModeConfigurationService: jest.fn(),
      getRepositories: jest.fn(),
    } as unknown as jest.Mocked<DeploymentsServices>;

    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(buildUser()),
      getOrganizationById: jest.fn().mockResolvedValue(buildOrganization()),
      isMemberOf: jest.fn().mockResolvedValue(true),
      isAdminOf: jest.fn(),
      getOrganizationIdBySlug: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn(),
      getSpaceBySlug: jest.fn(),
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockRecipesPort = {
      getRecipeByIdInternal: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    stubbedLogger = stubLogger();

    useCase = new CreatePackageUsecase(
      mockAccountsPort,
      mockServices,
      mockSpacesPort,
      mockRecipesPort,
      mockStandardsPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when all validation passes with recipes and standards', () => {
      it('creates and returns package', async () => {
        const mockSpace = buildSpace();
        const mockRecipe1 = buildRecipe(recipeId1, spaceId);
        const mockRecipe2 = buildRecipe(recipeId2, spaceId);
        const mockStandard1 = buildStandard(standardId1, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal
          .mockResolvedValueOnce(mockRecipe1)
          .mockResolvedValueOnce(mockRecipe2);
        mockStandardsPort.getStandard
          .mockResolvedValueOnce(mockStandard1)
          .mockResolvedValueOnce(mockStandard2);

        const createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [recipeId1, recipeId2],
          standards: [standardId1, standardId2],
        });

        mockPackageService.createPackage.mockResolvedValue(createdPackage);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [recipeId1, recipeId2],
          standardIds: [standardId1, standardId2],
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ package: createdPackage });
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId2,
        );
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId2);
        expect(mockPackageService.createPackage).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Package',
            slug: 'my-package',
            description: 'Package description',
            spaceId,
            createdBy: userId,
          }),
          [recipeId1, recipeId2],
          [standardId1, standardId2],
        );
      });
    });

    describe('when creating package with empty recipes array', () => {
      it('creates package without calling recipes port', async () => {
        const mockSpace = buildSpace();
        const mockStandard1 = buildStandard(standardId1, spaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard1);

        const createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [standardId1],
        });

        mockPackageService.createPackage.mockResolvedValue(createdPackage);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ package: createdPackage });
        expect(mockRecipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });
    });

    describe('when creating package with empty standards array', () => {
      it('creates package without calling standards port', async () => {
        const mockSpace = buildSpace();
        const mockRecipe1 = buildRecipe(recipeId1, spaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValueOnce(
          mockRecipe1,
        );

        const createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [recipeId1],
          standards: [],
        });

        mockPackageService.createPackage.mockResolvedValue(createdPackage);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [recipeId1],
          standardIds: [],
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ package: createdPackage });
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });
    });

    describe('when creating package with empty recipes and standards arrays', () => {
      it('creates package without calling recipes or standards ports', async () => {
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });

        mockPackageService.createPackage.mockResolvedValue(createdPackage);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
        };

        const result = await useCase.execute(command);

        expect(result).toEqual({ package: createdPackage });
        expect(mockRecipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });
    });

    describe('when space does not exist', () => {
      it('throws error', async () => {
        mockSpacesPort.getSpaceById.mockResolvedValue(null);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to different organization', () => {
      it('throws error', async () => {
        const differentOrgId = createOrganizationId(uuidv4());
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId: differentOrgId,
        };

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not exist', () => {
      it('throws error', async () => {
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(null);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [recipeId1],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe with id ${recipeId1} not found`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const mockSpace = buildSpace();
        const mockRecipe = buildRecipe(recipeId1, differentSpaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(mockRecipe);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [recipeId1],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe ${recipeId1} does not belong to space ${spaceId}`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not exist', () => {
      it('throws error', async () => {
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(null);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard with id ${standardId1} not found`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const mockSpace = buildSpace();
        const mockStandard = buildStandard(standardId1, differentSpaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(mockStandard);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard ${standardId1} does not belong to space ${spaceId}`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when service createPackage operation fails', () => {
      it('throws the error from service', async () => {
        const mockSpace = buildSpace();
        const error = new Error('Database connection failed');

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.createPackage.mockRejectedValue(error);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when spaces port fails', () => {
      it('throws the error from spaces port', async () => {
        const error = new Error('Spaces service unavailable');
        mockSpacesPort.getSpaceById.mockRejectedValue(error);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Spaces service unavailable',
        );
      });
    });

    describe('when recipes port fails', () => {
      it('throws the error from recipes port', async () => {
        const mockSpace = buildSpace();
        const error = new Error('Recipes service unavailable');

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockRejectedValue(error);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [recipeId1],
          standardIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Recipes service unavailable',
        );
      });
    });

    describe('when standards port fails', () => {
      it('throws the error from standards port', async () => {
        const mockSpace = buildSpace();
        const error = new Error('Standards service unavailable');

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockRejectedValue(error);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Standards service unavailable',
        );
      });
    });
  });
});
