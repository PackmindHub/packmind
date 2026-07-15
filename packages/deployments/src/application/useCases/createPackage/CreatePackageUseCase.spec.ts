import { CreatePackageUseCase } from './CreatePackageUseCase';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  createCommandId,
  createStandardId,
  createSkillId,
  IAccountsPort,
  ISpacesPort,
  ICommandsPort,
  IStandardsPort,
  ISkillsPort,
  CreatePackageCommand,
  Space,
  Command,
  Standard,
  Skill,
  CommandId,
  StandardId,
  SkillId,
  SpaceId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { v4 as uuidv4 } from 'uuid';
import { Package } from '../../../domain/entities/Package';

describe('CreatePackageUseCase', () => {
  let useCase: CreatePackageUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const commandId1 = createCommandId(uuidv4());
  const commandId2 = createCommandId(uuidv4());
  const standardId1 = createStandardId(uuidv4());
  const standardId2 = createStandardId(uuidv4());
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

  const buildCommand = (id: CommandId, spaceIdParam: SpaceId): Command => ({
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
    prompt: 'Test skill content',
    userId,
    spaceId: spaceIdParam,
    slug: '',
    version: 0,
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockPackageService = {
      createPackage: jest.fn(),
      findById: jest.fn(),
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
      findMembership: jest.fn().mockResolvedValue({
        userId,
        spaceId,
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockCommandsPort = {
      getCommandByIdInternal: jest.fn(),
    } as unknown as jest.Mocked<ICommandsPort>;

    mockStandardsPort = {
      getStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    stubbedLogger = stubLogger();

    useCase = new CreatePackageUseCase(
      mockSpacesPort,
      mockAccountsPort,
      mockServices,
      mockCommandsPort,
      mockStandardsPort,
      mockSkillsPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when all validation passes with recipes and standards', () => {
      let result: { package: Package };
      let createdPackage: Package;
      let command: CreatePackageCommand;

      beforeEach(async () => {
        const mockSpace = buildSpace();
        const mockCommand1 = buildCommand(commandId1, spaceId);
        const mockCommand2 = buildCommand(commandId2, spaceId);
        const mockStandard1 = buildStandard(standardId1, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal
          .mockResolvedValueOnce(mockCommand1)
          .mockResolvedValueOnce(mockCommand2);
        mockStandardsPort.getStandard
          .mockResolvedValueOnce(mockStandard1)
          .mockResolvedValueOnce(mockStandard2);

        createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [commandId1, commandId2],
          standards: [standardId1, standardId2],
        });

        mockPackageService.createPackage.mockResolvedValue(createdPackage);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [commandId1, commandId2],
          standardIds: [standardId1, standardId2],
          skillIds: [],
        };

        result = await useCase.execute(command);
      });

      it('returns the created package', () => {
        expect(result).toEqual({ package: createdPackage });
      });

      it('retrieves the space by id', () => {
        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('retrieves recipe 1 by id', () => {
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId1,
        );
      });

      it('retrieves recipe 2 by id', () => {
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId2,
        );
      });

      it('retrieves standard 1 by id', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });

      it('retrieves standard 2 by id', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId2);
      });

      it('creates the package with correct parameters', () => {
        expect(mockPackageService.createPackage).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Package',
            slug: 'my-package',
            description: 'Package description',
            spaceId,
            createdBy: userId,
          }),
          [commandId1, commandId2],
          [standardId1, standardId2],
          [],
        );
      });
    });

    describe('when creating package with empty recipes array', () => {
      let result: { package: Package };
      let createdPackage: Package;

      beforeEach(async () => {
        const mockSpace = buildSpace();
        const mockStandard1 = buildStandard(standardId1, spaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard1);

        createdPackage = packageFactory({
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
          skillIds: [],
        };

        result = await useCase.execute(command);
      });

      it('returns the created package', () => {
        expect(result).toEqual({ package: createdPackage });
      });

      it('does not call recipes port', () => {
        expect(mockCommandsPort.getCommandByIdInternal).not.toHaveBeenCalled();
      });

      it('retrieves the standard by id', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });
    });

    describe('when creating package with empty standards array', () => {
      let result: { package: Package };
      let createdPackage: Package;

      beforeEach(async () => {
        const mockSpace = buildSpace();
        const mockCommand1 = buildCommand(commandId1, spaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValueOnce(
          mockCommand1,
        );

        createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId,
          createdBy: userId,
          recipes: [commandId1],
          standards: [],
        });

        mockPackageService.createPackage.mockResolvedValue(createdPackage);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [commandId1],
          standardIds: [],
          skillIds: [],
        };

        result = await useCase.execute(command);
      });

      it('returns the created package', () => {
        expect(result).toEqual({ package: createdPackage });
      });

      it('retrieves the recipe by id', () => {
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId1,
        );
      });

      it('does not call standards port', () => {
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });
    });

    describe('when creating package with empty recipes and standards arrays', () => {
      let result: { package: Package };
      let createdPackage: Package;

      beforeEach(async () => {
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        createdPackage = packageFactory({
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
        };

        result = await useCase.execute(command);
      });

      it('returns the created package', () => {
        expect(result).toEqual({ package: createdPackage });
      });

      it('does not call recipes port', () => {
        expect(mockCommandsPort.getCommandByIdInternal).not.toHaveBeenCalled();
      });

      it('does not call standards port', () => {
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });
    });

    describe('when slug needs to be generated from name', () => {
      beforeEach(async () => {
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
        };

        await useCase.execute(command);
      });

      it('retrieves existing packages in the space', () => {
        expect(mockPackageService.getPackagesBySpaceId).toHaveBeenCalledWith(
          spaceId,
        );
      });

      it('creates the package with generated slug', () => {
        expect(mockPackageService.createPackage).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'my-package',
          }),
          [],
          [],
          [],
        );
      });
    });

    describe('when slug already exists in space', () => {
      beforeEach(async () => {
        const mockSpace = buildSpace();
        const existingPackage1 = packageFactory({
          name: 'My Package',
          slug: 'my-package',
          description: 'Existing package',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const existingPackage2 = packageFactory({
          name: 'My Package',
          slug: 'my-package-1',
          description: 'Another existing package',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.getPackagesBySpaceId.mockResolvedValue([
          existingPackage1,
          existingPackage2,
        ]);

        const createdPackage = packageFactory({
          name: 'My Package',
          slug: 'my-package-2',
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
        };

        await useCase.execute(command);
      });

      it('retrieves existing packages in the space', () => {
        expect(mockPackageService.getPackagesBySpaceId).toHaveBeenCalledWith(
          spaceId,
        );
      });

      it('creates the package with unique slug suffix', () => {
        expect(mockPackageService.createPackage).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'my-package-2',
          }),
          [],
          [],
          [],
        );
      });
    });

    describe('when space does not exist', () => {
      let command: CreatePackageCommand;

      beforeEach(() => {
        mockSpacesPort.getSpaceById.mockResolvedValue(null);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Space with id ${spaceId} not found`,
        );
      });

      it('retrieves the space by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to different organization', () => {
      let command: CreatePackageCommand;
      const differentOrgId = createOrganizationId(uuidv4());

      beforeEach(() => {
        const mockSpace: Space = {
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId: differentOrgId,
        };

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Space ${spaceId} does not belong to organization ${organizationId}`,
        );
      });

      it('retrieves the space by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not exist', () => {
      let command: CreatePackageCommand;

      beforeEach(() => {
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValue(null);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [commandId1],
          standardIds: [],
          skillIds: [],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe with id ${commandId1} not found`,
        );
      });

      it('retrieves the space by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('retrieves the recipe by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId1,
        );
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when recipe does not belong to space', () => {
      let command: CreatePackageCommand;
      const differentSpaceId = createSpaceId(uuidv4());

      beforeEach(() => {
        const mockSpace = buildSpace();
        const mockCommand = buildCommand(commandId1, differentSpaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValue(mockCommand);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [commandId1],
          standardIds: [],
          skillIds: [],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Recipe ${commandId1} does not belong to space ${spaceId}`,
        );
      });

      it('retrieves the space by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('retrieves the recipe by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId1,
        );
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not exist', () => {
      let command: CreatePackageCommand;

      beforeEach(() => {
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(null);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
          skillIds: [],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard with id ${standardId1} not found`,
        );
      });

      it('retrieves the space by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('retrieves the standard by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when standard does not belong to space', () => {
      let command: CreatePackageCommand;
      const differentSpaceId = createSpaceId(uuidv4());

      beforeEach(() => {
        const mockSpace = buildSpace();
        const mockStandard = buildStandard(standardId1, differentSpaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockStandardsPort.getStandard.mockResolvedValue(mockStandard);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
          skillIds: [],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard ${standardId1} does not belong to space ${spaceId}`,
        );
      });

      it('retrieves the space by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockSpacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
      });

      it('retrieves the standard by id', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId1);
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when skill does not exist', () => {
      let command: CreatePackageCommand;

      beforeEach(() => {
        const mockSpace = buildSpace();
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(null);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [skillId1],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Skill with id ${skillId1} not found`,
        );
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when skill does not belong to space', () => {
      let command: CreatePackageCommand;

      beforeEach(() => {
        const differentSpaceId = createSpaceId(uuidv4());
        const mockSpace = buildSpace();
        const mockSkill = buildSkill(skillId1, differentSpaceId);

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockResolvedValue(mockSkill);

        command = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [skillId1],
        };
      });

      it('throws error', async () => {
        await expect(useCase.execute(command)).rejects.toThrow(
          `Skill ${skillId1} does not belong to space ${spaceId}`,
        );
      });

      it('does not create package', async () => {
        try {
          await useCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(mockPackageService.createPackage).not.toHaveBeenCalled();
      });
    });

    describe('when skills port fails', () => {
      it('throws the error from skills port', async () => {
        const mockSpace = buildSpace();
        const error = new Error('Skills service unavailable');

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockSkillsPort.getSkill.mockRejectedValue(error);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [skillId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Skills service unavailable',
        );
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
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
        mockCommandsPort.getCommandByIdInternal.mockRejectedValue(error);

        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [commandId1],
          standardIds: [],
          skillIds: [],
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
          description: 'Package description',
          recipeIds: [],
          standardIds: [standardId1],
          skillIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Standards service unavailable',
        );
      });
    });

    describe('when the user is not a member of the space', () => {
      beforeEach(() => {
        mockSpacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws a SpaceMembershipRequiredError', async () => {
        const command: CreatePackageCommand = {
          userId,
          organizationId,
          spaceId,
          name: 'My Package',
          description: 'Package description',
          recipeIds: [],
          standardIds: [],
          skillIds: [],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });
  });
});
