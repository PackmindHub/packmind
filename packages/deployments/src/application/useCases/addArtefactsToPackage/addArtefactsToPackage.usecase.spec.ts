import { AddArtefactsToPackageUsecase } from './addArtefactsToPackage.usecase';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  createRecipeId,
  createStandardId,
  createPackageId,
  IAccountsPort,
  ISpacesPort,
  IRecipesPort,
  IStandardsPort,
  AddArtefactsToPackageCommand,
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
import { PackageRepository } from '../../../infra/repositories/PackageRepository';
import { v4 as uuidv4 } from 'uuid';

describe('AddArtefactsToPackageUsecase', () => {
  let useCase: AddArtefactsToPackageUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockPackageRepository: jest.Mocked<PackageRepository>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
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
    mockPackageRepository = {
      addRecipes: jest.fn(),
      addStandards: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageRepository>;

    mockPackageService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockServices = {
      getPackageService: jest.fn().mockReturnValue(mockPackageService),
      getPackageRepository: jest.fn().mockReturnValue(mockPackageRepository),
      getTargetService: jest.fn(),
      getRenderModeConfigurationService: jest.fn(),
      getRepositories: jest.fn().mockReturnValue({
        getPackageRepository: jest.fn().mockReturnValue(mockPackageRepository),
      }),
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

    useCase = new AddArtefactsToPackageUsecase(
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
    describe('when adding new recipes and standards to package', () => {
      it('adds artefacts and returns updated package', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });

        const mockSpace = buildSpace();
        const mockRecipe1 = buildRecipe(recipeId1, spaceId);
        const mockRecipe2 = buildRecipe(recipeId2, spaceId);
        const mockStandard1 = buildStandard(standardId1, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [recipeId1, recipeId2],
            standards: [standardId1, standardId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal
          .mockResolvedValueOnce(mockRecipe1)
          .mockResolvedValueOnce(mockRecipe2);
        mockStandardsPort.getStandard
          .mockResolvedValueOnce(mockStandard1)
          .mockResolvedValueOnce(mockStandard2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1, recipeId2],
          standardIds: [standardId1, standardId2],
        };

        const result = await useCase.execute(command);

        expect(result.package.recipes).toEqual([recipeId1, recipeId2]);
        expect(result.package.standards).toEqual([standardId1, standardId2]);
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId1, recipeId2],
        );
        expect(mockPackageRepository.addStandards).toHaveBeenCalledWith(
          packageId,
          [standardId1, standardId2],
        );
      });
    });

    describe('when adding only recipes to package', () => {
      it('adds recipes without calling standards port', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });

        const mockSpace = buildSpace();
        const mockRecipe1 = buildRecipe(recipeId1, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [recipeId1],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValueOnce(
          mockRecipe1,
        );

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
        };

        const result = await useCase.execute(command);

        expect(result.package.recipes).toEqual([recipeId1]);
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId1],
        );
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when adding only standards to package', () => {
      it('adds standards without calling recipes port', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });

        const mockSpace = buildSpace();
        const mockStandard1 = buildStandard(standardId1, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            standards: [standardId1],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard1);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          standardIds: [standardId1],
        };

        const result = await useCase.execute(command);

        expect(result.package.standards).toEqual([standardId1]);
        expect(mockPackageRepository.addStandards).toHaveBeenCalledWith(
          packageId,
          [standardId1],
        );
        expect(mockRecipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when adding artefacts that already exist in package', () => {
      it('filters out duplicates and adds only new artefacts', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [recipeId1],
          standards: [standardId1],
        });

        const mockSpace = buildSpace();
        const mockRecipe2 = buildRecipe(recipeId2, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [recipeId1, recipeId2],
            standards: [standardId1, standardId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValueOnce(
          mockRecipe2,
        );
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1, recipeId2],
          standardIds: [standardId1, standardId2],
        };

        await useCase.execute(command);

        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledTimes(1);
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId2,
        );
        expect(mockStandardsPort.getStandard).toHaveBeenCalledTimes(1);
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId2);
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId2],
        );
        expect(mockPackageRepository.addStandards).toHaveBeenCalledWith(
          packageId,
          [standardId2],
        );
      });
    });

    describe('when all artefacts already exist in package', () => {
      it('does not add any artefacts', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [recipeId1],
          standards: [standardId1],
        });

        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
          standardIds: [standardId1],
        };

        await useCase.execute(command);

        expect(mockRecipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when package does not exist', () => {
      it('throws error', async () => {
        mockPackageService.findById.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
          standardIds: [standardId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Package with id ${packageId} not found`,
        );

        expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when space does not exist', () => {
      it('throws error', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to different organization', () => {
      it('throws error', async () => {
        const differentOrgId = createOrganizationId(uuidv4());
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId: differentOrgId,
        };

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Package ${packageId} does not belong to organization ${organizationId}`,
        );

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not exist', () => {
      it('throws error', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe with id ${recipeId1} not found`,
        );

        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace = buildSpace();
        const mockRecipe = buildRecipe(recipeId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(mockRecipe);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe ${recipeId1} does not belong to space ${spaceId}`,
        );

        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not exist', () => {
      it('throws error', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          standardIds: [standardId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard with id ${standardId1} not found`,
        );

        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace = buildSpace();
        const mockStandard = buildStandard(standardId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(mockStandard);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          standardIds: [standardId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard ${standardId1} does not belong to space ${spaceId}`,
        );

        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when updated package cannot be retrieved', () => {
      it('throws error', async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace = buildSpace();
        const mockRecipe1 = buildRecipe(recipeId1, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce(null);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValueOnce(
          mockRecipe1,
        );

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Failed to retrieve updated package ${packageId}`,
        );

        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId1],
        );
      });
    });
  });
});
