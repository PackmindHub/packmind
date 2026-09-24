import {
  ArtefactRemovedFromPackageEvent,
  IAccountsPort,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  MoveArtefactsToPackageCommand,
  UserSpaceRole,
  createCommandId,
  createOrganizationId,
  createPackageId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createMockInstance,
  mockInterface,
  stubLogger,
} from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { organizationFactory, userFactory } from '@packmind/accounts/test';
import { commandFactory } from '@packmind/commands/test';
import { skillFactory } from '@packmind/skills/test';
import { spaceFactory } from '@packmind/spaces/test';
import { standardFactory } from '@packmind/standards/test';
import { packageFactory } from '../../../../test';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { ArtefactsMoveFailedError } from '../../../domain/errors/ArtefactsMoveFailedError';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { SpaceNotAccessibleError } from '../../../domain/errors/SpaceNotAccessibleError';
import { IDeploymentsRepositories } from '../../../domain/repositories/IDeploymentsRepositories';
import { PackageRepository } from '../../../infra/repositories/PackageRepository';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { MoveArtefactsToPackageUseCase } from './MoveArtefactsToPackageUseCase';
import { PackageChangeNotifier } from '../../services/PackageChangeNotifier';

describe('MoveArtefactsToPackageUseCase', () => {
  let mockPackageChangeNotifier: jest.Mocked<PackageChangeNotifier>;
  let useCase: MoveArtefactsToPackageUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockPackageRepository: jest.Mocked<PackageRepository>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const targetPackageId = createPackageId(uuidv4());
  const sourcePackageId = createPackageId(uuidv4());
  const otherSourcePackageId = createPackageId(uuidv4());
  const commandId = createCommandId(uuidv4());
  const standardId = createStandardId(uuidv4());
  const skillId = createSkillId(uuidv4());

  const moveCommand = (
    overrides: Partial<MoveArtefactsToPackageCommand> = {},
  ): MoveArtefactsToPackageCommand => ({
    userId,
    organizationId,
    spaceId,
    packageId: targetPackageId,
    recipeIds: [commandId],
    ...overrides,
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
    mockAccountsPort.getUserById.mockResolvedValue(
      userFactory({
        id: userId,
        memberships: [{ userId, organizationId, role: 'member' }],
      }),
    );
    mockAccountsPort.getOrganizationById.mockResolvedValue(
      organizationFactory({ id: organizationId }),
    );

    mockSpacesPort = mockInterface<ISpacesPort>();
    mockSpacesPort.getSpaceById.mockResolvedValue(
      spaceFactory({ id: spaceId, organizationId }),
    );
    mockSpacesPort.findMembership.mockResolvedValue({
      userId,
      spaceId,
      role: UserSpaceRole.MEMBER,
      pinned: false,
      createdBy: userId,
      updatedBy: userId,
    });

    mockCommandsPort = mockInterface<ICommandsPort>();
    mockCommandsPort.getCommandByIdInternal.mockResolvedValue(
      commandFactory({ id: commandId, spaceId }),
    );
    mockStandardsPort = mockInterface<IStandardsPort>();
    mockStandardsPort.getStandard.mockResolvedValue(
      standardFactory({ id: standardId, spaceId }),
    );
    mockSkillsPort = mockInterface<ISkillsPort>();
    mockSkillsPort.getSkill.mockResolvedValue(
      skillFactory({ id: skillId, spaceId }),
    );

    mockEventEmitterService = createMockInstance(PackmindEventEmitterService);
    stubbedLogger = stubLogger();

    mockPackageChangeNotifier = createMockInstance(PackageChangeNotifier);

    useCase = new MoveArtefactsToPackageUseCase(
      mockSpacesPort,
      mockAccountsPort,
      mockServices,
      mockCommandsPort,
      mockStandardsPort,
      mockSkillsPort,
      mockEventEmitterService,
      mockPackageChangeNotifier,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the artefact belongs to another package', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [],
      });
      const sourcePackage = packageFactory({
        id: sourcePackageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId],
      });

      mockPackageService.findById
        .mockResolvedValueOnce(targetPackage)
        .mockResolvedValueOnce({ ...targetPackage, recipes: [commandId] });
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        sourcePackage,
      ]);

      result = await useCase.execute(moveCommand());
    });

    it('tells the space its packages moved on', () => {
      expect(mockPackageChangeNotifier.packagesChanged).toHaveBeenCalledWith(
        organizationId,
        spaceId,
      );
    });

    it('adds the artefact to the target package', () => {
      expect(mockPackageRepository.addCommands).toHaveBeenCalledWith(
        targetPackageId,
        [commandId],
      );
    });

    it('removes the artefact from the package that held it', () => {
      expect(mockPackageRepository.removeCommands).toHaveBeenCalledWith(
        sourcePackageId,
        [commandId],
      );
    });

    it('reports the artefact as added', () => {
      expect(result.added.commands).toEqual([commandId]);
    });

    it('reports the package the artefact left', () => {
      expect(result.removedFrom).toEqual([
        {
          packageId: sourcePackageId,
          standards: [],
          commands: [commandId],
          skills: [],
        },
      ]);
    });

    it('emits an ArtefactRemovedFromPackageEvent for the emptied package', () => {
      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(ArtefactRemovedFromPackageEvent),
      );
    });

    it('reports the artefact now lives in the target package alone', () => {
      const event = mockEventEmitterService.emit.mock
        .calls[0][0] as ArtefactRemovedFromPackageEvent;
      expect(event.payload.remainingPackagesCount).toBe(1);
    });
  });

  describe('when the artefact belongs to several other packages', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [],
      });

      mockPackageService.findById
        .mockResolvedValueOnce(targetPackage)
        .mockResolvedValueOnce({ ...targetPackage, recipes: [commandId] });
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        packageFactory({
          id: sourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [commandId],
        }),
        packageFactory({
          id: otherSourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [commandId],
        }),
      ]);

      result = await useCase.execute(moveCommand());
    });

    it('empties every package that held the artefact', () => {
      expect(result.removedFrom.map((entry) => entry.packageId)).toEqual([
        sourcePackageId,
        otherSourcePackageId,
      ]);
    });

    it('removes the artefact from the second package too', () => {
      expect(mockPackageRepository.removeCommands).toHaveBeenCalledWith(
        otherSourcePackageId,
        [commandId],
      );
    });
  });

  describe('when the target package already holds the artefact', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId],
      });

      mockPackageService.findById.mockResolvedValue(targetPackage);
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        packageFactory({
          id: sourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [commandId],
        }),
      ]);

      result = await useCase.execute(moveCommand());
    });

    it('reports the artefact as skipped', () => {
      expect(result.skipped.commands).toEqual([commandId]);
    });

    it('adds nothing to the target package', () => {
      expect(mockPackageRepository.addCommands).not.toHaveBeenCalled();
    });

    it('still removes the artefact from the other package', () => {
      expect(mockPackageRepository.removeCommands).toHaveBeenCalledWith(
        sourcePackageId,
        [commandId],
      );
    });
  });

  describe('when the artefact belongs to no package', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [],
      });

      mockPackageService.findById
        .mockResolvedValueOnce(targetPackage)
        .mockResolvedValueOnce({ ...targetPackage, recipes: [commandId] });
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        packageFactory({
          id: sourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [],
        }),
      ]);

      result = await useCase.execute(moveCommand());
    });

    it('empties no package', () => {
      expect(result.removedFrom).toEqual([]);
    });
  });

  describe('when artefacts of every kind are moved', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [],
        standards: [],
        skills: [],
      });

      mockPackageService.findById
        .mockResolvedValueOnce(targetPackage)
        .mockResolvedValueOnce({
          ...targetPackage,
          recipes: [commandId],
          standards: [standardId],
          skills: [skillId],
        });
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        packageFactory({
          id: sourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [commandId],
          standards: [standardId],
          skills: [skillId],
        }),
      ]);

      result = await useCase.execute(
        moveCommand({
          recipeIds: [commandId],
          standardIds: [standardId],
          skillIds: [skillId],
        }),
      );
    });

    it('reports every kind as removed from the source package', () => {
      expect(result.removedFrom).toEqual([
        {
          packageId: sourcePackageId,
          standards: [standardId],
          commands: [commandId],
          skills: [skillId],
        },
      ]);
    });

    it('removes the skill from the source package', () => {
      expect(mockPackageRepository.removeSkills).toHaveBeenCalledWith(
        sourcePackageId,
        [skillId],
      );
    });
  });

  describe('when emptying a source package fails', () => {
    let error: unknown;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [],
      });

      mockPackageService.findById.mockResolvedValue(targetPackage);
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        packageFactory({
          id: sourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [commandId],
        }),
      ]);
      mockPackageRepository.removeCommands.mockImplementation(
        async (removedFrom) => {
          if (removedFrom === sourcePackageId) {
            throw new Error('connection lost');
          }
        },
      );

      error = await useCase.execute(moveCommand()).catch((caught) => caught);
    });

    it('fails with a move error', () => {
      expect(error).toBeInstanceOf(ArtefactsMoveFailedError);
    });

    it('takes the artefact back out of the target package', () => {
      expect(mockPackageRepository.removeCommands).toHaveBeenCalledWith(
        targetPackageId,
        [commandId],
      );
    });

    it('reports the move as rolled back', () => {
      expect((error as ArtefactsMoveFailedError).reverted).toBe(true);
    });

    it('emits no removal event', () => {
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when the rollback itself fails', () => {
    let error: unknown;

    beforeEach(async () => {
      const targetPackage = packageFactory({
        id: targetPackageId,
        spaceId,
        createdBy: userId,
        recipes: [],
      });

      mockPackageService.findById.mockResolvedValue(targetPackage);
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        targetPackage,
        packageFactory({
          id: sourcePackageId,
          spaceId,
          createdBy: userId,
          recipes: [commandId],
        }),
      ]);
      mockPackageRepository.removeCommands.mockRejectedValue(
        new Error('connection lost'),
      );

      error = await useCase.execute(moveCommand()).catch((caught) => caught);
    });

    it('reports the move as left partially applied', () => {
      expect((error as ArtefactsMoveFailedError).reverted).toBe(false);
    });
  });

  describe('when the target package is in another space', () => {
    let error: unknown;

    beforeEach(async () => {
      mockPackageService.findById.mockResolvedValue(
        packageFactory({
          id: targetPackageId,
          spaceId: createSpaceId(uuidv4()),
          createdBy: userId,
        }),
      );

      error = await useCase.execute(moveCommand()).catch((caught) => caught);
    });

    it('fails with a package-not-found error', () => {
      expect(error).toBeInstanceOf(PackageNotFoundError);
    });
  });

  describe('when the space belongs to another organization', () => {
    let error: unknown;

    beforeEach(async () => {
      mockSpacesPort.getSpaceById.mockResolvedValue(
        spaceFactory({
          id: spaceId,
          organizationId: createOrganizationId(uuidv4()),
        }),
      );

      error = await useCase.execute(moveCommand()).catch((caught) => caught);
    });

    it('fails with a space-not-accessible error', () => {
      expect(error).toBeInstanceOf(SpaceNotAccessibleError);
    });
  });

  describe('when the artefact lives in another space', () => {
    let error: unknown;

    beforeEach(async () => {
      mockPackageService.findById.mockResolvedValue(
        packageFactory({
          id: targetPackageId,
          spaceId,
          createdBy: userId,
          recipes: [],
        }),
      );
      mockCommandsPort.getCommandByIdInternal.mockResolvedValue(
        commandFactory({ id: commandId, spaceId: createSpaceId(uuidv4()) }),
      );

      error = await useCase.execute(moveCommand()).catch((caught) => caught);
    });

    it('fails with an artefact-not-in-space error', () => {
      expect(error).toBeInstanceOf(ArtefactNotInSpaceError);
    });
  });
});
