import { RemoveArtefactsFromPackageUseCase } from './RemoveArtefactsFromPackageUseCase';
import {
  RemoveArtefactsFromPackageCommand,
  ArtefactRemovedFromPackageEvent,
  createOrganizationId,
  createPackageId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  Space,
  SpaceType,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import {
  PackmindEventEmitterService,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import { packageFactory } from '../../../../test';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { PackageService } from '../../services/PackageService';
import { PackageRepository } from '../../../infra/repositories/PackageRepository';
import { v4 as uuidv4 } from 'uuid';

describe('RemoveArtefactsFromPackageUseCase', () => {
  let useCase: RemoveArtefactsFromPackageUseCase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockServices: jest.Mocked<DeploymentsServices>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockPackageRepository: jest.Mocked<PackageRepository>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const spaceId = createSpaceId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const commandId1 = createCommandId(uuidv4());
  const commandId2 = createCommandId(uuidv4());
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
    type: SpaceType.open,
    isDefaultSpace: true,
  });

  beforeEach(() => {
    mockPackageRepository = {
      removeCommands: jest.fn(),
      removeStandards: jest.fn(),
      removeSkills: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageRepository>;

    mockPackageService = {
      findById: jest.fn(),
      getPackagesBySpaceId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PackageService>;

    mockServices = {
      getPackageService: jest.fn().mockReturnValue(mockPackageService),
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
      findMembership: jest.fn().mockResolvedValue({
        userId,
        spaceId,
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    stubbedLogger = stubLogger();

    useCase = new RemoveArtefactsFromPackageUseCase(
      mockSpacesPort,
      mockAccountsPort,
      mockServices,
      mockEventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when removing artefacts present in the package', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId1, commandId2],
        standards: [standardId1],
        skills: [skillId1],
      });

      mockPackageService.findById
        .mockResolvedValueOnce(existingPackage)
        .mockResolvedValueOnce({
          ...existingPackage,
          recipes: [commandId2],
          standards: [],
          skills: [skillId1],
        });
      mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());

      const command: RemoveArtefactsFromPackageCommand = {
        userId,
        organizationId,
        spaceId,
        packageId,
        recipeIds: [commandId1],
        standardIds: [standardId1],
      };

      result = await useCase.execute(command);
    });

    it('calls removeCommands with only the removed recipe', () => {
      expect(mockPackageRepository.removeCommands).toHaveBeenCalledWith(
        packageId,
        [commandId1],
      );
    });

    it('calls removeStandards with the removed standard', () => {
      expect(mockPackageRepository.removeStandards).toHaveBeenCalledWith(
        packageId,
        [standardId1],
      );
    });

    it('leaves skills untouched', () => {
      expect(mockPackageRepository.removeSkills).not.toHaveBeenCalled();
    });

    it('returns removed commands', () => {
      expect(result.removed.commands).toEqual([commandId1]);
    });

    it('returns the updated package', () => {
      expect(result.package.recipes).toEqual([commandId2]);
    });
  });

  describe('when removing an artefact not in the package', () => {
    beforeEach(async () => {
      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId1],
        standards: [],
        skills: [],
      });

      mockPackageService.findById.mockResolvedValue(existingPackage);
      mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());

      const command: RemoveArtefactsFromPackageCommand = {
        userId,
        organizationId,
        spaceId,
        packageId,
        recipeIds: [commandId2],
      };

      await useCase.execute(command);
    });

    it('does not call removeCommands', () => {
      expect(mockPackageRepository.removeCommands).not.toHaveBeenCalled();
    });

    it('reports the artefact as skipped', async () => {
      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId1],
      });
      mockPackageService.findById.mockResolvedValue(existingPackage);

      const command: RemoveArtefactsFromPackageCommand = {
        userId,
        organizationId,
        spaceId,
        packageId,
        recipeIds: [commandId2],
      };

      const result = await useCase.execute(command);
      expect(result.skipped.commands).toEqual([commandId2]);
    });
  });

  describe('when a removed artefact still belongs to other packages', () => {
    let otherPackageId = createPackageId(uuidv4());

    beforeEach(async () => {
      otherPackageId = createPackageId(uuidv4());
      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId1],
      });
      const otherPackage = packageFactory({
        id: otherPackageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId1],
      });

      mockPackageService.findById
        .mockResolvedValueOnce(existingPackage)
        .mockResolvedValueOnce({ ...existingPackage, recipes: [] });
      mockPackageService.getPackagesBySpaceId.mockResolvedValue([
        { ...existingPackage, recipes: [] },
        otherPackage,
      ]);
      mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());

      const command: RemoveArtefactsFromPackageCommand = {
        userId,
        organizationId,
        spaceId,
        packageId,
        recipeIds: [commandId1],
      };

      await useCase.execute(command);
    });

    it('emits an ArtefactRemovedFromPackageEvent', () => {
      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(ArtefactRemovedFromPackageEvent),
      );
    });

    it('reports the artefact still lives in one other package', () => {
      const event = mockEventEmitterService.emit.mock
        .calls[0][0] as ArtefactRemovedFromPackageEvent;
      expect(event.payload.remainingPackagesCount).toBe(1);
    });
  });

  describe('when nothing is actually removed', () => {
    beforeEach(async () => {
      const existingPackage = packageFactory({
        id: packageId,
        spaceId,
        createdBy: userId,
        recipes: [commandId1],
      });
      mockPackageService.findById.mockResolvedValue(existingPackage);
      mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());

      const command: RemoveArtefactsFromPackageCommand = {
        userId,
        organizationId,
        spaceId,
        packageId,
        recipeIds: [commandId2],
      };

      await useCase.execute(command);
    });

    it('does not emit any event', () => {
      expect(mockEventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when the package does not exist', () => {
    let executePromise: Promise<unknown>;

    beforeEach(() => {
      mockSpacesPort.getSpaceById.mockResolvedValue(buildSpace());
      mockPackageService.findById.mockResolvedValue(null);

      const command: RemoveArtefactsFromPackageCommand = {
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
        `Package with id ${packageId} not found`,
      );
    });

    it('does not call removeCommands', async () => {
      await executePromise.catch(() => {
        /* expected rejection */
      });
      expect(mockPackageRepository.removeCommands).not.toHaveBeenCalled();
    });
  });

  describe('when the space does not exist', () => {
    it('throws error with space id', async () => {
      mockSpacesPort.getSpaceById.mockResolvedValue(null);

      const command: RemoveArtefactsFromPackageCommand = {
        userId,
        organizationId,
        spaceId,
        packageId,
        recipeIds: [commandId1],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        `Space with id ${spaceId} not found`,
      );
    });
  });

  describe('when the user is not a member of the space', () => {
    it('throws a SpaceMembershipRequiredError', async () => {
      mockSpacesPort.findMembership.mockResolvedValue(null);

      const command: RemoveArtefactsFromPackageCommand = {
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
