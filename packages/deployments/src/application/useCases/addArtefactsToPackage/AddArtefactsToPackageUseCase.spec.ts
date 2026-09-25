import { ArtefactAlreadyInAnotherPackageError } from '../../../domain/errors/ArtefactAlreadyInAnotherPackageError';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReloadFailedError } from '../../../domain/errors/PackageReloadFailedError';
import { SpaceNotAccessibleError } from '../../../domain/errors/SpaceNotAccessibleError';
import { AddArtefactsToPackageUseCase } from './AddArtefactsToPackageUseCase';
import {
  AddArtefactsToPackageCommand,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  Command,
  CommandId,
  Skill,
  SkillId,
  Space,
  SpaceId,
  SpaceType,
  Standard,
  StandardId,
  UserSpaceRole,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { SpaceMembershipRequiredError } from '@packmind/node-utils';
import {
  mockInterface,
  stubLogger,
  createMockInstance,
} from '@packmind/test-utils';
import { packageFactory } from '../../../../test';
import { IDeploymentsRepositories } from '../../../domain/repositories/IDeploymentsRepositories';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { PackageRepository } from '../../../infra/repositories/PackageRepository';
import { v4 as uuidv4 } from 'uuid';
import { spaceFactory } from '@packmind/spaces/test';
import { SpaceContentNotifier } from '../../services/SpaceContentNotifier';

describe('AddArtefactsToPackageUseCase', () => {
  let mockSpaceContentNotifier: jest.Mocked<SpaceContentNotifier>;
  let useCase: AddArtefactsToPackageUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockPackageRepository: jest.Mocked<PackageRepository>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const commandId1 = createCommandId(uuidv4());
  const commandId2 = createCommandId(uuidv4());
  const standardId1 = createStandardId(uuidv4());
  const standardId2 = createStandardId(uuidv4());
  const skillId1 = createSkillId(uuidv4());
  const skillId2 = createSkillId(uuidv4());

  const buildUser = () => ({
    id: userId,
    email: 'test@example.com',
    displayName: null,
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

  const buildSpace = (): Space =>
    spaceFactory({
      id: spaceId,
      slug: 'test-space',
      name: 'Test Space',
      organizationId,
      type: SpaceType.open,
      isDefaultSpace: true,
    });

  const buildCommand = (id: CommandId, spaceIdParam: SpaceId): Command => ({
    id,
    name: `Recipe ${id}`,
    slug: `recipe-${id}`,
    content: 'Test recipe content',
    version: 1,
    userId,
    spaceId: spaceIdParam,
    movedTo: null,
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
    movedTo: null,
  });

  const buildSkill = (id: SkillId, spaceIdParam: SpaceId): Skill => ({
    id,
    name: `Skill ${id}`,
    slug: `skill-${id}`,
    description: 'Test skill',
    spaceId: spaceIdParam,
    createdBy: {
      userId,
      displayName: 'Test User',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    prompt: 'Prompt',
    userId,
    movedTo: null,
  });

  beforeEach(() => {
    mockPackageRepository = createMockInstance(PackageRepository);

    mockPackageService = createMockInstance(PackageService);

    mockServices = createMockInstance(DeploymentsServices);
    mockServices.getPackageService.mockReturnValue(mockPackageService);
    const mockRepositories = mockInterface<IDeploymentsRepositories>();
    mockRepositories.getPackageRepository.mockReturnValue(
      mockPackageRepository,
    );
    mockServices.getRepositories.mockReturnValue(mockRepositories);

    mockAccountsPort = mockInterface<IAccountsPort>();
    mockAccountsPort.getUserById.mockResolvedValue(buildUser());
    mockAccountsPort.getOrganizationById.mockResolvedValue(buildOrganization());

    mockSpacesPort = mockInterface<ISpacesPort>();
    mockSpacesPort.findMembership.mockResolvedValue({
      userId,
      spaceId,
      role: UserSpaceRole.MEMBER,
      pinned: false,
      createdBy: userId,
      updatedBy: userId,
    });

    mockCommandsPort = mockInterface<ICommandsPort>();

    mockStandardsPort = mockInterface<IStandardsPort>();

    mockSkillsPort = mockInterface<ISkillsPort>();

    stubbedLogger = stubLogger();

    /*
     * No other package in the space unless a `describe` says otherwise, so the
     * conflict check has nothing to find and the expectations below read as the
     * plain adds they were written as.
     */
    mockPackageService.getPackagesBySpaceId.mockResolvedValue([]);

    mockSpaceContentNotifier = createMockInstance(SpaceContentNotifier);

    useCase = new AddArtefactsToPackageUseCase(
      mockSpacesPort,
      mockAccountsPort,
      mockServices,
      mockCommandsPort,
      mockStandardsPort,
      mockSkillsPort,
      mockSpaceContentNotifier,
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
        const mockCommand1 = buildCommand(commandId1, spaceId);
        const mockCommand2 = buildCommand(commandId2, spaceId);
        const mockStandard1 = buildStandard(standardId1, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [commandId1, commandId2],
            standards: [standardId1, standardId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal
          .mockResolvedValueOnce(mockCommand1)
          .mockResolvedValueOnce(mockCommand2);
        mockStandardsPort.getStandard
          .mockResolvedValueOnce(mockStandard1)
          .mockResolvedValueOnce(mockStandard2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1, commandId2],
          standardIds: [standardId1, standardId2],
        };

        result = await useCase.execute(command);
      });

      it('tells the space it moved on', () => {
        expect(
          mockSpaceContentNotifier.spaceContentChanged,
        ).toHaveBeenCalledWith(organizationId, spaceId);
      });

      it('returns updated package with recipes', () => {
        expect(result.package.recipes).toEqual([commandId1, commandId2]);
      });

      it('returns updated package with standards', () => {
        expect(result.package.standards).toEqual([standardId1, standardId2]);
      });

      it('calls addRecipes with correct arguments', () => {
        expect(mockPackageRepository.addCommands).toHaveBeenCalledWith(
          packageId,
          [commandId1, commandId2],
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
        const mockCommand1 = buildCommand(commandId1, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [commandId1],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValueOnce(
          mockCommand1,
        );

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        result = await useCase.execute(command);
      });

      it('returns updated package with recipes', () => {
        expect(result.package.recipes).toEqual([commandId1]);
      });

      it('calls addRecipes with correct arguments', () => {
        expect(mockPackageRepository.addCommands).toHaveBeenCalledWith(
          packageId,
          [commandId1],
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
          spaceId,
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
        expect(mockCommandsPort.getCommandByIdInternal).not.toHaveBeenCalled();
      });

      it('does not call addRecipes', () => {
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
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
          recipes: [commandId1],
          standards: [standardId1],
        });

        const mockSpace = buildSpace();
        const mockCommand2 = buildCommand(commandId2, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [commandId1, commandId2],
            standards: [standardId1, standardId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValueOnce(
          mockCommand2,
        );
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1, commandId2],
          standardIds: [standardId1, standardId2],
        };

        await useCase.execute(command);
      });

      it('calls getRecipeByIdInternal only for new recipe', () => {
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledTimes(
          1,
        );
      });

      it('fetches only the new recipe', () => {
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId2,
        );
      });

      it('calls getStandard only for new standard', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledTimes(1);
      });

      it('fetches only the new standard', () => {
        expect(mockStandardsPort.getStandard).toHaveBeenCalledWith(standardId2);
      });

      it('calls addRecipes with only new recipe', () => {
        expect(mockPackageRepository.addCommands).toHaveBeenCalledWith(
          packageId,
          [commandId2],
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
          recipes: [commandId1],
          standards: [standardId1],
        });

        const mockSpace = buildSpace();

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
          standardIds: [standardId1],
        };

        await useCase.execute(command);
      });

      it('does not call getRecipeByIdInternal', () => {
        expect(mockCommandsPort.getCommandByIdInternal).not.toHaveBeenCalled();
      });

      it('does not call getStandard', () => {
        expect(mockStandardsPort.getStandard).not.toHaveBeenCalled();
      });

      it('does not call addRecipes', () => {
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
      });

      it('does not call addStandards', () => {
        expect(mockPackageRepository.addStandards).not.toHaveBeenCalled();
      });
    });

    describe('when package does not exist', () => {
      let executePromise: Promise<unknown>;

      beforeEach(() => {
        const mockSpace = buildSpace();
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.findById.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
          standardIds: [standardId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with package id', async () => {
        await expect(executePromise).rejects.toThrow(
          new PackageNotFoundError(packageId, spaceId),
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
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
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
        mockSpacesPort.getSpaceById.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with space id', async () => {
        await expect(executePromise).rejects.toThrow(
          new SpaceNotAccessibleError(spaceId, organizationId),
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
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
      });
    });

    describe('when space belongs to different organization', () => {
      let executePromise: Promise<unknown>;
      const differentOrgId = createOrganizationId(uuidv4());

      beforeEach(() => {
        const mockSpace: Space = spaceFactory({
          id: spaceId,
          slug: 'test-space',
          name: 'Test Space',
          organizationId: differentOrgId,
          type: SpaceType.open,
          isDefaultSpace: true,
        });

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with package and organization ids', async () => {
        await expect(executePromise).rejects.toThrow(
          new SpaceNotAccessibleError(spaceId, organizationId),
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
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
      });
    });

    describe('when package does not belong to space', () => {
      let executePromise: Promise<unknown>;
      const differentSpaceId = createSpaceId(uuidv4());

      beforeEach(() => {
        const existingPackage = packageFactory({
          id: packageId,
          name: 'My Package',
          slug: 'my-package',
          description: 'Package description',
          spaceId: differentSpaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
        });
        const mockSpace = buildSpace();

        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockPackageService.findById.mockResolvedValue(existingPackage);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with package and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          new PackageNotFoundError(packageId, spaceId),
        );
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
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
        mockCommandsPort.getCommandByIdInternal.mockResolvedValue(null);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with recipe id', async () => {
        await expect(executePromise).rejects.toThrow(
          new ArtefactNotInSpaceError('command', commandId1, spaceId),
        );
      });

      it('calls getRecipeByIdInternal with recipe id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId1,
        );
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
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
        const mockCommand = buildCommand(commandId1, differentSpaceId);

        mockPackageService.findById.mockResolvedValue(existingPackage);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValue(mockCommand);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with recipe and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          new ArtefactNotInSpaceError('command', commandId1, spaceId),
        );
      });

      it('calls getRecipeByIdInternal with recipe id', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockCommandsPort.getCommandByIdInternal).toHaveBeenCalledWith(
          commandId1,
        );
      });

      it('does not call addRecipes', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
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
          spaceId,
          packageId,
          standardIds: [standardId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with standard id', async () => {
        await expect(executePromise).rejects.toThrow(
          new ArtefactNotInSpaceError('standard', standardId1, spaceId),
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
          spaceId,
          packageId,
          standardIds: [standardId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with standard and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          new ArtefactNotInSpaceError('standard', standardId1, spaceId),
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
        const mockCommand1 = buildCommand(commandId1, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce(null);
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValueOnce(
          mockCommand1,
        );

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with package id', async () => {
        await expect(executePromise).rejects.toThrow(
          new PackageReloadFailedError(packageId),
        );
      });

      it('calls addRecipes before failing', async () => {
        await executePromise.catch(() => {
          /* expected rejection */
        });
        expect(mockPackageRepository.addCommands).toHaveBeenCalledWith(
          packageId,
          [commandId1],
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
          spaceId,
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
          spaceId,
          packageId,
          skillIds: [skillId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with skill id', async () => {
        await expect(executePromise).rejects.toThrow(
          new ArtefactNotInSpaceError('skill', skillId1, spaceId),
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
          spaceId,
          packageId,
          skillIds: [skillId1],
        };

        executePromise = useCase.execute(command);
      });

      it('throws error with skill and space ids', async () => {
        await expect(executePromise).rejects.toThrow(
          new ArtefactNotInSpaceError('skill', skillId1, spaceId),
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
          spaceId,
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
          recipes: [commandId1],
          standards: [standardId1],
          skills: [skillId1],
        });

        const mockSpace = buildSpace();
        const mockCommand2 = buildCommand(commandId2, spaceId);
        const mockStandard2 = buildStandard(standardId2, spaceId);
        const mockSkill2 = buildSkill(skillId2, spaceId);

        mockPackageService.findById
          .mockResolvedValueOnce(existingPackage)
          .mockResolvedValueOnce({
            ...existingPackage,
            recipes: [commandId1, commandId2],
            standards: [standardId1, standardId2],
            skills: [skillId1, skillId2],
          });
        mockSpacesPort.getSpaceById.mockResolvedValue(mockSpace);
        mockCommandsPort.getCommandByIdInternal.mockResolvedValueOnce(
          mockCommand2,
        );
        mockStandardsPort.getStandard.mockResolvedValueOnce(mockStandard2);
        mockSkillsPort.getSkill.mockResolvedValueOnce(mockSkill2);

        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1, commandId2],
          standardIds: [standardId1, standardId2],
          skillIds: [skillId1, skillId2],
        };

        result = await useCase.execute(command);
      });

      it('returns added commands', () => {
        expect(result.added.commands).toEqual([commandId2]);
      });

      it('returns skipped commands', () => {
        expect(result.skipped.commands).toEqual([commandId1]);
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

    /*
     * The original report: two readers each saw the skill in no package at all,
     * and each added it to their own. Neither request was wrong about what it
     * had read, and the second one is the one that has to notice.
     */
    describe('when the skill already belongs to another package', () => {
      const otherPackageId = createPackageId(uuidv4());
      let executePromise: Promise<unknown>;

      beforeEach(() => {
        const targetPackage = packageFactory({
          id: packageId,
          name: 'Backend playbook',
          slug: 'backend-playbook',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [],
        });

        mockPackageService.findById.mockResolvedValue(targetPackage);
        mockPackageService.getPackagesBySpaceId.mockResolvedValue([
          targetPackage,
          packageFactory({
            id: otherPackageId,
            name: 'Frontend playbook',
            slug: 'frontend-playbook',
            spaceId,
            createdBy: userId,
            recipes: [],
            standards: [],
            skills: [skillId1],
          }),
        ]);
        mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());
        mockSkillsPort.getSkill.mockResolvedValue({
          ...buildSkill(skillId1, spaceId),
          name: 'Deploy runbook',
        });

        executePromise = useCase.execute({
          userId,
          organizationId,
          spaceId,
          packageId,
          skillIds: [skillId1],
        });
        executePromise.catch(() => undefined);
      });

      it('refuses the add', async () => {
        await expect(executePromise).rejects.toBeInstanceOf(
          ArtefactAlreadyInAnotherPackageError,
        );
      });

      /*
       * The CLI versions in the field print this message and nothing else —
       * they have no branch for this reason and cannot add a word to it — so
       * the sentence has to name what happened and what to do on its own.
       */
      it('says what happened and what to do, in one sentence', async () => {
        await expect(executePromise).rejects.toThrow(
          'The skill "Deploy runbook" is in "Frontend playbook", and an artefact belongs to a single package. Move it to "Backend playbook" instead of adding it.',
        );
      });

      it('answers 409 rather than a server error', async () => {
        await expect(executePromise).rejects.toMatchObject({
          kind: 'conflict',
          reason: 'artefact_already_in_another_package',
        });
      });

      it('writes nothing', async () => {
        await executePromise.catch(() => undefined);

        expect(mockPackageRepository.addSkills).not.toHaveBeenCalled();
      });

      it('announces nothing, no reader having anything to refetch', async () => {
        await executePromise.catch(() => undefined);

        expect(
          mockSpaceContentNotifier.spaceContentChanged,
        ).not.toHaveBeenCalled();
      });
    });

    /*
     * Which of the three lists an id came out of is part of the question. A
     * package holds its standards, commands and skills separately and an id is
     * only unique within one of them, so an id looked up across all three
     * answers for an artefact the caller never named — and refuses an add that
     * conflicts with nothing.
     */
    describe('when another package holds a different artefact type with the same id', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        const targetPackage = packageFactory({
          id: packageId,
          name: 'Backend playbook',
          slug: 'backend-playbook',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [],
        });

        mockPackageService.findById.mockResolvedValue(targetPackage);
        mockPackageService.getPackagesBySpaceId.mockResolvedValue([
          targetPackage,
          packageFactory({
            id: createPackageId(uuidv4()),
            name: 'Frontend playbook',
            slug: 'frontend-playbook',
            spaceId,
            createdBy: userId,
            recipes: [],
            // The skill being added, spelled as a standard id.
            standards: [createStandardId(String(skillId1))],
            skills: [],
          }),
        ]);
        mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());
        mockSkillsPort.getSkill.mockResolvedValue(
          buildSkill(skillId1, spaceId),
        );

        result = await useCase.execute({
          userId,
          organizationId,
          spaceId,
          packageId,
          skillIds: [skillId1],
        });
      });

      it('adds the skill', () => {
        expect(result.added.skills).toEqual([skillId1]);
      });
    });

    describe('when the artefact is already in the package it is added to', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        const targetPackage = packageFactory({
          id: packageId,
          name: 'Backend playbook',
          slug: 'backend-playbook',
          spaceId,
          createdBy: userId,
          recipes: [],
          standards: [],
          skills: [skillId1],
        });

        mockPackageService.findById.mockResolvedValue(targetPackage);
        mockPackageService.getPackagesBySpaceId.mockResolvedValue([
          targetPackage,
        ]);
        mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());

        result = await useCase.execute({
          userId,
          organizationId,
          spaceId,
          packageId,
          skillIds: [skillId1],
        });
      });

      // The package holding it is the one being added to, which is not a
      // conflict but the request already being satisfied.
      it('skips it rather than refusing', () => {
        expect(result.skipped.skills).toEqual([skillId1]);
      });
    });

    describe('when the user is not a member of the space', () => {
      beforeEach(() => {
        mockSpacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws a SpaceMembershipRequiredError', async () => {
        const command: AddArtefactsToPackageCommand = {
          userId,
          organizationId,
          spaceId,
          packageId,
          recipeIds: [commandId1],
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });
  });
});
