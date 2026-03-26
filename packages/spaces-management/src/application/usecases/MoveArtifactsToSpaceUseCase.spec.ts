import {
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  MoveArtifactsToSpaceCommand,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { stubLogger } from '@packmind/test-utils';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../domain/errors/SpaceOwnershipMismatchError';
import { MoveArtifactsToSpaceUseCase } from './MoveArtifactsToSpaceUseCase';

describe('MoveArtifactsToSpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const sourceSpaceId = createSpaceId('source-space-id');
  const destinationSpaceId = createSpaceId('destination-space-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  const sourceSpace = spaceFactory({
    id: sourceSpaceId,
    organizationId,
    name: 'Source Space',
  });
  const destinationSpace = spaceFactory({
    id: destinationSpaceId,
    organizationId,
    name: 'Destination Space',
  });

  let useCase: MoveArtifactsToSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const buildCommand = (
    overrides?: Partial<MoveArtifactsToSpaceCommand>,
  ): MoveArtifactsToSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    sourceSpaceId,
    destinationSpaceId,
    artifacts: [],
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn().mockImplementation((id) => {
        if (id === sourceSpaceId) return Promise.resolve(sourceSpace);
        if (id === destinationSpaceId) return Promise.resolve(destinationSpace);
        return Promise.resolve(null);
      }),
    } as unknown as jest.Mocked<ISpacesPort>;

    standardsPort = {
      markStandardAsMoved: jest.fn().mockResolvedValue(undefined),
      duplicateStandardToSpace: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<IStandardsPort>;

    skillsPort = {
      markSkillAsMoved: jest.fn().mockResolvedValue(undefined),
      duplicateSkillToSpace: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ISkillsPort>;

    recipesPort = {
      markRecipeAsMoved: jest.fn().mockResolvedValue(undefined),
      duplicateRecipeToSpace: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<IRecipesPort>;

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };

    useCase = new MoveArtifactsToSpaceUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      skillsPort,
      recipesPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the user is not a member of the organization', () => {
      beforeEach(() => {
        accountsPort.getUserById.mockResolvedValue(
          userFactory({ id: userId, memberships: [] }),
        );
      });

      it('throws an access error', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow();
      });
    });

    describe('when the source space does not exist', () => {
      beforeEach(() => {
        spacesPort.getSpaceById.mockImplementation((id) => {
          if (id === destinationSpaceId)
            return Promise.resolve(destinationSpace);
          return Promise.resolve(null);
        });
      });

      it('throws SpaceNotFoundError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceNotFoundError,
        );
      });
    });

    describe('when the source space belongs to a different organization', () => {
      const otherOrgId = createOrganizationId('other-org-id');

      beforeEach(() => {
        spacesPort.getSpaceById.mockImplementation((id) => {
          if (id === sourceSpaceId)
            return Promise.resolve(
              spaceFactory({
                id: sourceSpaceId,
                organizationId: otherOrgId,
              }),
            );
          if (id === destinationSpaceId)
            return Promise.resolve(destinationSpace);
          return Promise.resolve(null);
        });
      });

      it('throws SpaceOwnershipMismatchError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceOwnershipMismatchError,
        );
      });
    });

    describe('when the destination space does not exist', () => {
      beforeEach(() => {
        spacesPort.getSpaceById.mockImplementation((id) => {
          if (id === sourceSpaceId) return Promise.resolve(sourceSpace);
          return Promise.resolve(null);
        });
      });

      it('throws SpaceNotFoundError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceNotFoundError,
        );
      });
    });

    describe('when the destination space belongs to a different organization', () => {
      const otherOrgId = createOrganizationId('other-org-id');

      beforeEach(() => {
        spacesPort.getSpaceById.mockImplementation((id) => {
          if (id === sourceSpaceId) return Promise.resolve(sourceSpace);
          if (id === destinationSpaceId)
            return Promise.resolve(
              spaceFactory({
                id: destinationSpaceId,
                organizationId: otherOrgId,
              }),
            );
          return Promise.resolve(null);
        });
      });

      it('throws SpaceOwnershipMismatchError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceOwnershipMismatchError,
        );
      });
    });

    describe('when moving standards', () => {
      const standardId1 = createStandardId('standard-1');
      const standardId2 = createStandardId('standard-2');

      it('returns the correct moved count', async () => {
        const result = await useCase.execute(
          buildCommand({
            artifacts: [
              { id: standardId1, type: 'standard' },
              { id: standardId2, type: 'standard' },
            ],
          }),
        );

        expect(result).toEqual({ movedCount: 2 });
      });

      it('duplicates before marking the original as moved', async () => {
        const callOrder: string[] = [];
        standardsPort.markStandardAsMoved.mockImplementation(async () => {
          callOrder.push('markAsMoved');
        });
        standardsPort.duplicateStandardToSpace.mockImplementation(async () => {
          callOrder.push('duplicate');
          return {} as never;
        });

        await useCase.execute(
          buildCommand({ artifacts: [{ id: standardId1, type: 'standard' }] }),
        );

        expect(callOrder).toEqual(['duplicate', 'markAsMoved']);
      });

      it('calls markStandardAsMoved with the correct parameters', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: standardId1, type: 'standard' }] }),
        );

        expect(standardsPort.markStandardAsMoved).toHaveBeenCalledWith(
          standardId1,
          destinationSpaceId,
        );
      });

      it('calls duplicateStandardToSpace with the correct parameters', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: standardId1, type: 'standard' }] }),
        );

        expect(standardsPort.duplicateStandardToSpace).toHaveBeenCalledWith(
          standardId1,
          destinationSpaceId,
          userId,
        );
      });

      it('emits a PlaybookArtefactMovedEvent per standard', async () => {
        await useCase.execute(
          buildCommand({
            artifacts: [
              { id: standardId1, type: 'standard' },
              { id: standardId2, type: 'standard' },
            ],
          }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledTimes(2);
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              artifactType: 'standard',
              sourceSpaceId,
              destinationSpaceId,
              userId,
              organizationId,
            }),
          }),
        );
      });
    });

    describe('when moving skills', () => {
      const skillId1 = createSkillId('skill-1');
      const skillId2 = createSkillId('skill-2');

      it('returns the correct moved count', async () => {
        const result = await useCase.execute(
          buildCommand({
            artifacts: [
              { id: skillId1, type: 'skill' },
              { id: skillId2, type: 'skill' },
            ],
          }),
        );

        expect(result).toEqual({ movedCount: 2 });
      });

      it('duplicates before marking the original as moved', async () => {
        const callOrder: string[] = [];
        skillsPort.markSkillAsMoved.mockImplementation(async () => {
          callOrder.push('markAsMoved');
        });
        skillsPort.duplicateSkillToSpace.mockImplementation(async () => {
          callOrder.push('duplicate');
          return {} as never;
        });

        await useCase.execute(
          buildCommand({ artifacts: [{ id: skillId1, type: 'skill' }] }),
        );

        expect(callOrder).toEqual(['duplicate', 'markAsMoved']);
      });

      it('calls markSkillAsMoved with the correct parameters', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: skillId1, type: 'skill' }] }),
        );

        expect(skillsPort.markSkillAsMoved).toHaveBeenCalledWith(
          skillId1,
          destinationSpaceId,
        );
      });

      it('calls duplicateSkillToSpace with the correct parameters', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: skillId1, type: 'skill' }] }),
        );

        expect(skillsPort.duplicateSkillToSpace).toHaveBeenCalledWith(
          skillId1,
          destinationSpaceId,
          userId,
        );
      });

      it('emits a PlaybookArtefactMovedEvent with artifactType skill', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: skillId1, type: 'skill' }] }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              artifactType: 'skill',
              sourceSpaceId,
              destinationSpaceId,
              userId,
              organizationId,
            }),
          }),
        );
      });
    });

    describe('when moving recipes', () => {
      const recipeId1 = createRecipeId('recipe-1');
      const recipeId2 = createRecipeId('recipe-2');

      it('returns the correct moved count', async () => {
        const result = await useCase.execute(
          buildCommand({
            artifacts: [
              { id: recipeId1, type: 'command' },
              { id: recipeId2, type: 'command' },
            ],
          }),
        );

        expect(result).toEqual({ movedCount: 2 });
      });

      it('duplicates before marking the original as moved', async () => {
        const callOrder: string[] = [];
        recipesPort.markRecipeAsMoved.mockImplementation(async () => {
          callOrder.push('markAsMoved');
        });
        recipesPort.duplicateRecipeToSpace.mockImplementation(async () => {
          callOrder.push('duplicate');
          return {} as never;
        });

        await useCase.execute(
          buildCommand({ artifacts: [{ id: recipeId1, type: 'command' }] }),
        );

        expect(callOrder).toEqual(['duplicate', 'markAsMoved']);
      });

      it('calls markRecipeAsMoved with the correct parameters', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: recipeId1, type: 'command' }] }),
        );

        expect(recipesPort.markRecipeAsMoved).toHaveBeenCalledWith(
          recipeId1,
          destinationSpaceId,
        );
      });

      it('calls duplicateRecipeToSpace with the correct parameters', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: recipeId1, type: 'command' }] }),
        );

        expect(recipesPort.duplicateRecipeToSpace).toHaveBeenCalledWith(
          recipeId1,
          destinationSpaceId,
          userId,
        );
      });

      it('emits a PlaybookArtefactMovedEvent with artifactType command', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: recipeId1, type: 'command' }] }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              artifactType: 'command',
              sourceSpaceId,
              destinationSpaceId,
              userId,
              organizationId,
            }),
          }),
        );
      });
    });

    describe('when moving multiple artifact types at once', () => {
      const standardId = createStandardId('standard-1');
      const skillId = createSkillId('skill-1');
      const recipeId = createRecipeId('recipe-1');

      it('returns the total moved count across all types', async () => {
        const result = await useCase.execute(
          buildCommand({
            artifacts: [
              { id: standardId, type: 'standard' },
              { id: skillId, type: 'skill' },
              { id: recipeId, type: 'command' },
            ],
          }),
        );

        expect(result).toEqual({ movedCount: 3 });
      });

      it('emits one event per artifact', async () => {
        await useCase.execute(
          buildCommand({
            artifacts: [
              { id: standardId, type: 'standard' },
              { id: skillId, type: 'skill' },
              { id: recipeId, type: 'command' },
            ],
          }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledTimes(3);
      });
    });

    describe('when no artifacts are provided', () => {
      it('returns zero moved count', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual({ movedCount: 0 });
      });

      it('does not emit any events', async () => {
        await useCase.execute(buildCommand());

        expect(eventEmitterService.emit).not.toHaveBeenCalled();
      });
    });
  });
});
