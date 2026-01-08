import { UpdatePackageUsecase } from './updatePackage.usecase';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  createRecipeId,
  createStandardId,
  createSkillId,
  createPackageId,
  IAccountsPort,
  ISpacesPort,
  IRecipesPort,
  IStandardsPort,
  ISkillsPort,
  UpdatePackageCommand,
  Space,
  Recipe,
  Standard,
  Skill,
  RecipeId,
  StandardId,
  SkillId,
  SpaceId,
  PackageId,
  Package,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { v4 as uuidv4 } from 'uuid';

describe('UpdatePackageUsecase', () => {
  let useCase: UpdatePackageUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
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
  const standardId1 = createStandardId(uuidv4());
  const skillId1 = createSkillId(uuidv4());

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
    prompt: 'Test prompt',
    version: 1,
    userId,
    spaceId: spaceIdParam,
  });

  const buildExistingPackage = (pkgId: PackageId, pkgSpaceId: SpaceId) =>
    packageFactory({
      id: pkgId,
      name: 'Existing Package',
      slug: 'existing-package',
      description: 'Existing description',
      spaceId: pkgSpaceId,
      createdBy: userId,
      recipes: [],
      standards: [],
      skills: [],
    });

  beforeEach(() => {
    mockPackageService = {
      createPackage: jest.fn(),
      findById: jest.fn(),
      updatePackage: jest.fn(),
      getPackagesBySpaceId: jest.fn().mockResolvedValue([]),
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

    mockSkillsPort = {
      getSkill: jest.fn(),
      getSkillVersion: jest.fn(),
      getLatestSkillVersion: jest.fn(),
      listSkillVersions: jest.fn(),
      listSkillsBySpace: jest.fn(),
      findSkillBySlug: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    stubbedLogger = stubLogger();

    useCase = new UpdatePackageUsecase(
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
    describe('when all validation passes with skills', () => {
      let result: { package: Package };
      let updatedPackage: Package;
      let command: UpdatePackageCommand;

      beforeEach(async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();
        const mockSkill = buildSkill(skillId1, spaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(mockSkill);

        updatedPackage = packageFactory({
          id: packageId,
          name: 'Updated Package',
          slug: 'updated-package',
          description: 'Updated description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [skillId1],
        });

        mockPackageService.updatePackage.mockResolvedValue(updatedPackage);

        command = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [skillId1],
        };

        result = await useCase.execute(command);
      });

      it('returns the updated package', () => {
        expect(result).toEqual({ package: updatedPackage });
      });

      it('validates the skill exists', () => {
        expect(mockSkillsPort.getSkill).toHaveBeenCalledWith(skillId1);
      });

      it('calls updatePackage with skillIds', () => {
        expect(mockPackageService.updatePackage).toHaveBeenCalledWith(
          packageId,
          'Updated Package',
          'Updated description',
          [],
          [],
          [skillId1],
        );
      });
    });

    describe('when updating package with empty skills array', () => {
      beforeEach(async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const updatedPackage = packageFactory({
          id: packageId,
          name: 'Updated Package',
          slug: 'updated-package',
          description: 'Updated description',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [],
        });

        mockPackageService.updatePackage.mockResolvedValue(updatedPackage);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [],
        };

        await useCase.execute(command);
      });

      it('does not call skills port', () => {
        expect(mockSkillsPort.getSkill).not.toHaveBeenCalled();
      });
    });

    describe('when package does not exist', () => {
      it('throws error', async () => {
        mockPackageService.findById.mockResolvedValue(null);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Package with id ${packageId} not found`,
        );
      });
    });

    describe('when space does not exist', () => {
      it('throws error', async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(null);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });
    });

    describe('when package does not belong to organization', () => {
      it('throws error', async () => {
        const differentOrgId = createOrganizationId(uuidv4());
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId: differentOrgId,
        };

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Package ${packageId} does not belong to organization ${organizationId}`,
        );
      });
    });

    describe('when skill does not exist', () => {
      it('throws error', async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(null);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [skillId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Skill with id ${skillId1} not found`,
        );
      });
    });

    describe('when skill does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();
        const mockSkill = buildSkill(skillId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(mockSkill);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [skillId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Skill ${skillId1} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when recipe does not exist', () => {
      it('throws error', async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(null);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [recipeId1],
          standardIds: [],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe with id ${recipeId1} not found`,
        );
      });
    });

    describe('when recipe does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();
        const mockRecipe = buildRecipe(recipeId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(mockRecipe);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [recipeId1],
          standardIds: [],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe ${recipeId1} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when standard does not exist', () => {
      it('throws error', async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(null);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [standardId1],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard with id ${standardId1} not found`,
        );
      });
    });

    describe('when standard does not belong to space', () => {
      it('throws error', async () => {
        const differentSpaceId = createSpaceId(uuidv4());
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();
        const mockStandard = buildStandard(standardId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(mockStandard);

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [standardId1],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard ${standardId1} does not belong to space ${spaceId}`,
        );
      });
    });

    describe('when skills port fails', () => {
      it('throws the error', async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockRejectedValue(
          new Error('Skills service unavailable'),
        );

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [skillId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Skills service unavailable',
        );
      });
    });

    describe('when service updatePackage operation fails', () => {
      it('throws the error', async () => {
        const existingPackage = buildExistingPackage(packageId, spaceId);
        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.updatePackage.mockRejectedValue(
          new Error('Database connection failed'),
        );

        const command: UpdatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          name: 'Updated Package',
          description: 'Updated description',
          recipeIds: [],
          standardIds: [],
          skillsIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });
  });
});
