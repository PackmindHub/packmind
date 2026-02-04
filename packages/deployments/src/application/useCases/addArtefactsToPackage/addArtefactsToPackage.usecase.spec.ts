import { AddArtefactsToPackageUsecase } from './addArtefactsToPackage.usecase';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  createRecipeId,
  createStandardId,
  createPackageId,
  createSkillId,
  IAccountsPort,
  ISpacesPort,
  IRecipesPort,
  IStandardsPort,
  ISkillsPort,
  AddArtefactsToPackageCommand,
  Space,
  Recipe,
  Standard,
  Skill,
  RecipeId,
  StandardId,
  SkillId,
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
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const recipeId1 = createRecipeId(uuidv4());
  const recipeId2 = createRecipeId(uuidv4());
  const standardId1 = createStandardId(uuidv4());
  const standardId2 = createStandardId(uuidv4());
  const skillId1 = createSkillId(uuidv4());
  const skillId2 = createSkillId(uuidv4());

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

  const buildSkill = (id: SkillId, spaceIdParam: SpaceId): Skill => ({
    id,
    name: `Skill ${id}`,
    slug: `skill-${id}`,
    description: 'Test skill',
    spaceId: spaceIdParam,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockPackageRepository = {
      addRecipes: jest.fn(),
      addStandards: jest.fn(),
      addSkills: jest.fn(),
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

    mockSkillsPort = {
      getSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    stubbedLogger = stubLogger();

    useCase = new AddArtefactsToPackageUsecase(
      mockAccountsPort,
      mockServices,
      mockSpacesPort,
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when adding new recipes and standards to package', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
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

        result = await useCase.execute(command);
      });

      it('returns updated package with recipes', () => {
        expect(result.package.recipes).toEqual([recipeId1, recipeId2]);
      });

      it('returns updated package with standards', () => {
        expect(result.package.standards).toEqual([standardId1, standardId2]);
      });

      it('calls addRecipes with correct arguments', () => {
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId1, recipeId2],
        );
      });

      it('calls addStandards with correct arguments', () => {
        expect(mockPackageRepository.addStandards).toHaveBeenCalledWith(
          packageId,
          [standardId1, standardId2],
        );
      });
    });

    describe('when adding only recipes to package', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
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

        result = await useCase.execute(command);
      });

      it('returns updated package with recipes', () => {
        expect(result.package.recipes).toEqual([recipeId1]);
      });

      it('calls addRecipes with correct arguments', () => {
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId1],
        );
      });

      it('does not call standards port', () => {
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });

      it('does not call addStandards', () => {
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when adding only standards to package', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
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

        result = await useCase.execute(command);
      });

      it('returns updated package with standards', () => {
        expect(result.package.standards).toEqual([standardId1]);
      });

      it('calls addStandards with correct arguments', () => {
        expect(mockPackageRepository.addStandards).toHaveBeenCalledWith(
          packageId,
          [standardId1],
        );
      });

      it('does not call recipes port', () => {
        expect(mockRecipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
      });

      it('does not call addRecipes', () => {
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when adding artefacts that already exist in package', () => {
      beforeEach(async () => {
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
      });

      it('calls getRecipeByIdInternal only for new recipe', () => {
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledTimes(1);
      });

      it('fetches only the new recipe', () => {
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId2,
        );
      });

      it('calls getStandard only for new standard', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledTimes(1);
      });

      it('fetches only the new standard', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId2);
      });

      it('calls addRecipes with only new recipe', () => {
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId2],
        );
      });

      it('calls addStandards with only new standard', () => {
        expect(mockPackageRepository.addStandards).toHaveBeenCalledWith(
          packageId,
          [standardId2],
        );
      });
    });

    describe('when all artefacts already exist in package', () => {
      beforeEach(async () => {
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
      });

      it('does not call getRecipeByIdInternal', () => {
        expect(mockRecipesPort.getRecipeByIdInternal).not.toHaveBeenCalled();
      });

      it('does not call getStandard', () => {
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });

      it('does not call addRecipes', () => {
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });

      it('does not call addStandards', () => {
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when package does not exist', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
        mockPackageService.findById.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1],
          standardIds: [standardId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with package id', async () => {
        await expect(executePromise).rejects.toThrow(
          `Package with id ${packageId} not found`,
        );
      });

      it('calls findById with package id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageService.findById).toHaveBeenCalledWith(packageId);
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });

      it('does not call addStandards', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when space does not exist', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with space id', async () => {
        await expect(executePromise).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });

      it('calls getSpaceById with space id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to different organization', () => {
      let executePromise: Promise<unknown>;
      const differentOrgId = createOrganizationId(uuidv4());

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with package and organization ids', async () => {
        await expect(executePromise).rejects.toThrow(
          `Package ${packageId} does not belong to organization ${organizationId}`,
        );
      });

      it('calls getSpaceById with space id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not exist', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with recipe id', async () => {
        await expect(executePromise).rejects.toThrow(
          `Recipe with id ${recipeId1} not found`,
        );
      });

      it('calls getRecipeByIdInternal with recipe id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not belong to space', () => {
      let executePromise: Promise<unknown>;
      const differentSpaceId = createSpaceId(uuidv4());

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with recipe and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          `Recipe ${recipeId1} does not belong to space ${spaceId}`,
        );
      });

      it('calls getRecipeByIdInternal with recipe id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockRecipesPort.getRecipeByIdInternal).toHaveBeenCalledWith(
          recipeId1,
        );
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addRecipes).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not exist', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with standard id', async () => {
        await expect(executePromise).rejects.toThrow(
          `Standard with id ${standardId1} not found`,
        );
      });

      it('calls getStandard with standard id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });

      it('does not call addStandards', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not belong to space', () => {
      let executePromise: Promise<unknown>;
      const differentSpaceId = createSpaceId(uuidv4());

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with standard and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          `Standard ${standardId1} does not belong to space ${spaceId}`,
        );
      });

      it('calls getStandard with standard id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });

      it('does not call addStandards', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when updated package cannot be retrieved', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
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

        executePromise = useCase.execute(command);
      });

      it('throws error with package id', async () => {
        await expect(executePromise).rejects.toThrow(
          `Failed to retrieve updated package ${packageId}`,
        );
      });

      it('calls addRecipes before failing', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addRecipes).toHaveBeenCalledWith(
          packageId,
          [recipeId1],
        );
      });
    });

    describe('when adding skills to package', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [],
        });

        const mockSpace = buildSpace();
        const mockSkill1 = buildSkill(skillId1, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            skills: [skillId1],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValueOnce(mockSkill1);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          skillIds: [skillId1],
        };

        result = await useCase.execute(command);
      });

      it('returns updated package with skills', () => {
        expect(result.package.skills).toEqual([skillId1]);
      });

      it('calls addSkills with correct arguments', () => {
        expect(mockPackageRepository.addSkills).toHaveBeenCalledWith(
          packageId,
          [skillId1],
        );
      });

      it('returns added skills in response', () => {
        expect(result.added.skills).toEqual([skillId1]);
      });

      it('returns empty skipped skills', () => {
        expect(result.skipped.skills).toEqual([]);
      });
    });

    describe('when skill does not exist', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [],
        });
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          skillIds: [skillId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with skill id', async () => {
        await expect(executePromise).rejects.toThrow(
          `Skill with id ${skillId1} not found`,
        );
      });
    });

    describe('when skill does not belong to space', () => {
      let executePromise: Promise<unknown>;
      const differentSpaceId = createSpaceId(uuidv4());

      beforeEach(() => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [],
        });
        const mockSpace = buildSpace();
        const mockSkill = buildSkill(skillId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(mockSkill);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          skillIds: [skillId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with skill and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          `Skill ${skillId1} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when some skills already exist in package', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [skillId1],
        });

        const mockSpace = buildSpace();
        const mockSkill2 = buildSkill(skillId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            skills: [skillId1, skillId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValueOnce(mockSkill2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          skillIds: [skillId1, skillId2],
        };

        result = await useCase.execute(command);
      });

      it('calls addSkills with only new skill', () => {
        expect(mockPackageRepository.addSkills).toHaveBeenCalledWith(
          packageId,
          [skillId2],
        );
      });

      it('returns added skills', () => {
        expect(result.added.skills).toEqual([skillId2]);
      });

      it('returns skipped skills', () => {
        expect(result.skipped.skills).toEqual([skillId1]);
      });
    });

    describe('when returning added and skipped response', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [recipeId1],
          standards: [standardId1],
          skills: [skillId1],
        });

        const mockSpace = buildSpace();
        const mockRecipe2 = buildRecipe(recipeId2, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);
        const mockSkill2 = buildSkill(skillId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [recipeId1, recipeId2],
            standards: [standardId1, standardId2],
            skills: [skillId1, skillId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValueOnce(
          mockRecipe2,
        );
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard2);
        mockSkillsPort.getSkill.mockResolvedValueOnce(mockSkill2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          packageId,
          recipeIds: [recipeId1, recipeId2],
          standardIds: [standardId1, standardId2],
          skillIds: [skillId1, skillId2],
        };

        result = await useCase.execute(command);
      });

      it('returns added commands', () => {
        expect(result.added.commands).toEqual([recipeId2]);
      });

      it('returns skipped commands', () => {
        expect(result.skipped.commands).toEqual([recipeId1]);
      });

      it('returns added standards', () => {
        expect(result.added.standards).toEqual([standardId2]);
      });

      it('returns skipped standards', () => {
        expect(result.skipped.standards).toEqual([standardId1]);
      });

      it('returns added skills', () => {
        expect(result.added.skills).toEqual([skillId2]);
      });

      it('returns skipped skills', () => {
        expect(result.skipped.skills).toEqual([skillId1]);
      });
    });
  });
});
