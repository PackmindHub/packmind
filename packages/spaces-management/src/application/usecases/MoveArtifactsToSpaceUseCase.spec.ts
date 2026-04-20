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
  StandardDeletedEvent,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { standardFactory } from '@packmind/standards/test/standardFactory';
import { skillFactory } from '@packmind/skills/test/skillFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { stubLogger } from '@packmind/test-utils';
import { SpaceNotFoundError } from '@packmind/spaces';
import { ArtifactNameConflictError } from '../../domain/errors/ArtifactNameConflictError';
import { ArtifactSlugConflictError } from '../../domain/errors/ArtifactSlugConflictError';
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
      duplicateStandardToSpace: jest.fn().mockResolvedValue({
        standard: { id: createStandardId('new-standard-id') },
        ruleMappings: [],
      }),
      getStandard: jest.fn().mockResolvedValue(null),
      listStandardsBySpace: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    skillsPort = {
      markSkillAsMoved: jest.fn().mockResolvedValue(undefined),
      duplicateSkillToSpace: jest
        .fn()
        .mockResolvedValue({ id: createSkillId('new-skill-id') }),
      getSkill: jest.fn().mockResolvedValue(null),
      listSkillsBySpace: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    recipesPort = {
      markRecipeAsMoved: jest.fn().mockResolvedValue(undefined),
      duplicateRecipeToSpace: jest
        .fn()
        .mockResolvedValue({ id: createRecipeId('new-recipe-id') }),
      getRecipeByIdInternal: jest.fn().mockResolvedValue(null),
      listRecipesBySpace: jest.fn().mockResolvedValue([]),
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
          return {
            standard: { id: createStandardId('new-standard-id') },
            ruleMappings: [],
          } as never;
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

      describe('when emitting events for moved standards', () => {
        beforeEach(async () => {
          await useCase.execute(
            buildCommand({
              artifacts: [
                { id: standardId1, type: 'standard' },
                { id: standardId2, type: 'standard' },
              ],
            }),
          );
        });

        it('emits two events per standard (moved + deleted)', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(4);
        });

        it('emits a PlaybookArtefactMovedEvent with standard artifact type', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledWith(
            expect.objectContaining({
              payload: expect.objectContaining({
                artifactType: 'standard',
                oldArtifactId: standardId1,
                newArtifactId: createStandardId('new-standard-id'),
                sourceSpaceId,
                destinationSpaceId,
                userId,
                organizationId,
              }),
            }),
          );
        });

        it('emits a StandardDeletedEvent for each moved standard', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledWith(
            expect.any(StandardDeletedEvent),
          );
        });
      });

      it('emits a StandardDeletedEvent with the source space', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: standardId1, type: 'standard' }] }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              standardId: standardId1,
              spaceId: sourceSpaceId,
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
              oldArtifactId: skillId1,
              newArtifactId: createSkillId('new-skill-id'),
              sourceSpaceId,
              destinationSpaceId,
              userId,
              organizationId,
            }),
          }),
        );
      });

      it('emits a SkillDeletedEvent with the source space', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: skillId1, type: 'skill' }] }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              skillId: skillId1,
              spaceId: sourceSpaceId,
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
              oldArtifactId: recipeId1,
              newArtifactId: createRecipeId('new-recipe-id'),
              sourceSpaceId,
              destinationSpaceId,
              userId,
              organizationId,
            }),
          }),
        );
      });

      it('emits a CommandDeletedEvent with the source space', async () => {
        await useCase.execute(
          buildCommand({ artifacts: [{ id: recipeId1, type: 'command' }] }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              id: recipeId1,
              spaceId: sourceSpaceId,
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

      it('emits two events per artifact (moved + deleted)', async () => {
        await useCase.execute(
          buildCommand({
            artifacts: [
              { id: standardId, type: 'standard' },
              { id: skillId, type: 'skill' },
              { id: recipeId, type: 'command' },
            ],
          }),
        );

        expect(eventEmitterService.emit).toHaveBeenCalledTimes(6);
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

    describe('when a standard with the same slug already exists in the destination space', () => {
      const standardId = createStandardId('standard-to-move');
      const conflictingSlug = 'git-commit-guidelines';

      beforeEach(() => {
        standardsPort.getStandard.mockResolvedValue(
          standardFactory({
            id: standardId,
            slug: conflictingSlug,
            name: 'My Git Guidelines',
            spaceId: sourceSpaceId,
          }),
        );
        standardsPort.listStandardsBySpace.mockResolvedValue([
          standardFactory({
            slug: conflictingSlug,
            name: 'Git commit guidelines',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('throws ArtifactSlugConflictError', async () => {
        await expect(
          useCase.execute(
            buildCommand({
              artifacts: [{ id: standardId, type: 'standard' }],
            }),
          ),
        ).rejects.toThrow(ArtifactSlugConflictError);
      });

      describe('when the move is attempted', () => {
        beforeEach(async () => {
          await useCase
            .execute(
              buildCommand({
                artifacts: [{ id: standardId, type: 'standard' }],
              }),
            )
            .catch(() => {
              /* expected */
            });
        });

        it('does not duplicate the standard', () => {
          expect(standardsPort.duplicateStandardToSpace).not.toHaveBeenCalled();
        });

        it('does not mark the standard as moved', () => {
          expect(standardsPort.markStandardAsMoved).not.toHaveBeenCalled();
        });
      });
    });

    describe('when a skill with the same slug already exists in the destination space', () => {
      const skillId = createSkillId('skill-to-move');
      const conflictingSlug = 'commit';

      beforeEach(() => {
        skillsPort.getSkill.mockResolvedValue(
          skillFactory({
            id: skillId,
            slug: conflictingSlug,
            name: 'Commit Skill',
            spaceId: sourceSpaceId,
          }),
        );
        skillsPort.listSkillsBySpace.mockResolvedValue([
          skillFactory({
            slug: conflictingSlug,
            name: 'commit',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('throws ArtifactSlugConflictError', async () => {
        await expect(
          useCase.execute(
            buildCommand({
              artifacts: [{ id: skillId, type: 'skill' }],
            }),
          ),
        ).rejects.toThrow(ArtifactSlugConflictError);
      });

      describe('when the move is attempted', () => {
        beforeEach(async () => {
          await useCase
            .execute(
              buildCommand({
                artifacts: [{ id: skillId, type: 'skill' }],
              }),
            )
            .catch(() => {
              /* expected */
            });
        });

        it('does not duplicate the skill', () => {
          expect(skillsPort.duplicateSkillToSpace).not.toHaveBeenCalled();
        });

        it('does not mark the skill as moved', () => {
          expect(skillsPort.markSkillAsMoved).not.toHaveBeenCalled();
        });
      });
    });

    describe('when a command with the same slug already exists in the destination space', () => {
      const recipeId = createRecipeId('recipe-to-move');
      const conflictingSlug = 'release-cli';

      beforeEach(() => {
        recipesPort.getRecipeByIdInternal.mockResolvedValue(
          recipeFactory({
            id: recipeId,
            slug: conflictingSlug,
            name: 'Release CLI Command',
            spaceId: sourceSpaceId,
          }),
        );
        recipesPort.listRecipesBySpace.mockResolvedValue([
          recipeFactory({
            slug: conflictingSlug,
            name: 'release-cli',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('throws ArtifactSlugConflictError', async () => {
        await expect(
          useCase.execute(
            buildCommand({
              artifacts: [{ id: recipeId, type: 'command' }],
            }),
          ),
        ).rejects.toThrow(ArtifactSlugConflictError);
      });

      describe('when the move is attempted', () => {
        beforeEach(async () => {
          await useCase
            .execute(
              buildCommand({
                artifacts: [{ id: recipeId, type: 'command' }],
              }),
            )
            .catch(() => {
              /* expected */
            });
        });

        it('does not duplicate the recipe', () => {
          expect(recipesPort.duplicateRecipeToSpace).not.toHaveBeenCalled();
        });

        it('does not mark the recipe as moved', () => {
          expect(recipesPort.markRecipeAsMoved).not.toHaveBeenCalled();
        });
      });
    });

    describe('when a standard with the same name already exists in the destination space', () => {
      const standardId = createStandardId('standard-to-move');

      beforeEach(() => {
        standardsPort.getStandard.mockResolvedValue(
          standardFactory({
            id: standardId,
            slug: 'unique-standard-slug',
            name: 'Git commit guidelines',
            spaceId: sourceSpaceId,
          }),
        );
        standardsPort.listStandardsBySpace.mockResolvedValue([
          standardFactory({
            slug: 'different-slug',
            name: 'Git commit guidelines',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('throws ArtifactNameConflictError', async () => {
        await expect(
          useCase.execute(
            buildCommand({
              artifacts: [{ id: standardId, type: 'standard' }],
            }),
          ),
        ).rejects.toThrow(ArtifactNameConflictError);
      });

      describe('when the move is attempted', () => {
        beforeEach(async () => {
          await useCase
            .execute(
              buildCommand({
                artifacts: [{ id: standardId, type: 'standard' }],
              }),
            )
            .catch(() => {
              /* expected */
            });
        });

        it('does not duplicate the standard', () => {
          expect(standardsPort.duplicateStandardToSpace).not.toHaveBeenCalled();
        });

        it('does not mark the standard as moved', () => {
          expect(standardsPort.markStandardAsMoved).not.toHaveBeenCalled();
        });
      });
    });

    describe('when a skill with the same name already exists in the destination space', () => {
      const skillId = createSkillId('skill-to-move');

      beforeEach(() => {
        skillsPort.getSkill.mockResolvedValue(
          skillFactory({
            id: skillId,
            slug: 'unique-skill-slug',
            name: 'commit',
            spaceId: sourceSpaceId,
          }),
        );
        skillsPort.listSkillsBySpace.mockResolvedValue([
          skillFactory({
            slug: 'different-slug',
            name: 'commit',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('throws ArtifactNameConflictError', async () => {
        await expect(
          useCase.execute(
            buildCommand({
              artifacts: [{ id: skillId, type: 'skill' }],
            }),
          ),
        ).rejects.toThrow(ArtifactNameConflictError);
      });

      describe('when the move is attempted', () => {
        beforeEach(async () => {
          await useCase
            .execute(
              buildCommand({
                artifacts: [{ id: skillId, type: 'skill' }],
              }),
            )
            .catch(() => {
              /* expected */
            });
        });

        it('does not duplicate the skill', () => {
          expect(skillsPort.duplicateSkillToSpace).not.toHaveBeenCalled();
        });

        it('does not mark the skill as moved', () => {
          expect(skillsPort.markSkillAsMoved).not.toHaveBeenCalled();
        });
      });
    });

    describe('when a command with the same name already exists in the destination space', () => {
      const recipeId = createRecipeId('recipe-to-move');

      beforeEach(() => {
        recipesPort.getRecipeByIdInternal.mockResolvedValue(
          recipeFactory({
            id: recipeId,
            slug: 'unique-recipe-slug',
            name: 'release-cli',
            spaceId: sourceSpaceId,
          }),
        );
        recipesPort.listRecipesBySpace.mockResolvedValue([
          recipeFactory({
            slug: 'different-slug',
            name: 'release-cli',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('throws ArtifactNameConflictError', async () => {
        await expect(
          useCase.execute(
            buildCommand({
              artifacts: [{ id: recipeId, type: 'command' }],
            }),
          ),
        ).rejects.toThrow(ArtifactNameConflictError);
      });

      describe('when the move is attempted', () => {
        beforeEach(async () => {
          await useCase
            .execute(
              buildCommand({
                artifacts: [{ id: recipeId, type: 'command' }],
              }),
            )
            .catch(() => {
              /* expected */
            });
        });

        it('does not duplicate the recipe', () => {
          expect(recipesPort.duplicateRecipeToSpace).not.toHaveBeenCalled();
        });

        it('does not mark the recipe as moved', () => {
          expect(recipesPort.markRecipeAsMoved).not.toHaveBeenCalled();
        });
      });
    });

    describe('when artifacts have different slugs and names than those in the destination space', () => {
      const standardId = createStandardId('standard-to-move');

      beforeEach(() => {
        standardsPort.getStandard.mockResolvedValue(
          standardFactory({
            id: standardId,
            slug: 'unique-standard',
            name: 'Unique Standard',
            spaceId: sourceSpaceId,
          }),
        );
        standardsPort.listStandardsBySpace.mockResolvedValue([
          standardFactory({
            slug: 'other-standard',
            name: 'Other Standard',
            spaceId: destinationSpaceId,
          }),
        ]);
      });

      it('moves the artifact successfully', async () => {
        const result = await useCase.execute(
          buildCommand({
            artifacts: [{ id: standardId, type: 'standard' }],
          }),
        );

        expect(result).toEqual({ movedCount: 1 });
      });
    });
  });
});
