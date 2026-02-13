import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  createOrganizationId,
  createRecipeId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { skillFactory } from '@packmind/skills/test/skillFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { ChangeProposalPayloadMismatchError } from '../../errors/ChangeProposalPayloadMismatchError';
import { UnsupportedChangeProposalTypeError } from '../../errors/UnsupportedChangeProposalTypeError';
import { CreateChangeProposalUseCase } from './CreateChangeProposalUseCase';
import { CommandChangeProposalValidator } from '../../validators/CommandChangeProposalValidator';
import { SkillChangeProposalValidator } from '../../validators/SkillChangeProposalValidator';

describe('CreateChangeProposalUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');
  const recipeId = createRecipeId('recipe-id');
  const skillId = createSkillId('skill-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });
  const recipe = recipeFactory({ id: recipeId, spaceId, version: 5 });
  const skill = skillFactory({
    id: skillId,
    spaceId,
    version: 3,
    name: 'My Skill',
    description: 'Skill description',
    prompt: 'Skill prompt',
  });

  let useCase: CreateChangeProposalUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<
      CreateChangeProposalCommand<ChangeProposalType.updateCommandName>
    >,
  ): CreateChangeProposalCommand<ChangeProposalType.updateCommandName> => ({
    userId: userId,
    organizationId: organizationId,
    spaceId: spaceId,
    type: ChangeProposalType.updateCommandName,
    artefactId: recipeId,
    payload: { oldValue: recipe.name, newValue: 'New Recipe Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    recipesPort = {
      getRecipeById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      getSkill: jest.fn(),
      getLatestSkillVersion: jest.fn(),
      getSkillFiles: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    service = {
      createChangeProposal: jest.fn(),
      findExistingPending: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new CreateChangeProposalUseCase(
      accountsPort,
      spacesPort,
      service,
      [
        new CommandChangeProposalValidator(recipesPort),
        new SkillChangeProposalValidator(skillsPort),
      ],
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when type is updateCommandName', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.updateCommandName>['changeProposal'],
      });
    });

    it('delegates to service with recipe version', async () => {
      await useCase.execute(command);

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
        }),
        5,
      );
    });

    it('calls getRecipeById with access control', async () => {
      await useCase.execute(command);

      expect(recipesPort.getRecipeById).toHaveBeenCalledWith({
        userId: userId as unknown as string,
        organizationId,
        spaceId,
        recipeId,
      });
    });

    it('returns wasCreated true', async () => {
      const result = await useCase.execute(command);

      expect(result.wasCreated).toBe(true);
    });
  });

  describe('when type is updateCommandDescription', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateCommandDescription as unknown as ChangeProposalType.updateCommandName,
      payload: { oldValue: recipe.content, newValue: 'new content' },
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.updateCommandDescription>['changeProposal'],
      });
    });

    it('delegates to service with recipe version', async () => {
      await useCase.execute(command);

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandDescription,
        }),
        5,
      );
    });
  });

  describe('when type is updateSkillName', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillsPort.getSkill.mockResolvedValue(skill);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.updateSkillName>['changeProposal'],
      });
    });

    it('delegates to service with skill version', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillName as unknown as ChangeProposalType.updateCommandName,
        artefactId: skillId as unknown as string,
        payload: { oldValue: skill.name, newValue: 'New Skill Name' },
      });

      await useCase.execute(command);

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateSkillName,
          artefactId: skillId,
        }),
        3,
      );
    });

    it('calls getSkill with the artefactId', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillName as unknown as ChangeProposalType.updateCommandName,
        artefactId: skillId as unknown as string,
        payload: { oldValue: skill.name, newValue: 'New Skill Name' },
      });

      await useCase.execute(command);

      expect(skillsPort.getSkill).toHaveBeenCalledWith(skillId);
    });
  });

  describe('when skill is not found', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillsPort.getSkill.mockResolvedValue(null);
    });

    it('throws an error', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillDescription as unknown as ChangeProposalType.updateCommandName,
        artefactId: skillId as unknown as string,
        payload: { oldValue: 'old', newValue: 'new' },
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        `Skill ${skillId} not found`,
      );
    });
  });

  describe('when skill payload oldValue does not match', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillsPort.getSkill.mockResolvedValue(skill);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      const command = buildCommand({
        type: ChangeProposalType.updateSkillName as unknown as ChangeProposalType.updateCommandName,
        artefactId: skillId as unknown as string,
        payload: { oldValue: 'Wrong Name', newValue: 'New Name' },
      });

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });
  });

  describe('when type is addSkillFile', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillsPort.getSkill.mockResolvedValue(skill);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.addSkillFile>['changeProposal'],
      });
    });

    it('delegates to service with skill version', async () => {
      const command = {
        userId,
        organizationId,
        spaceId,
        type: ChangeProposalType.addSkillFile,
        artefactId: skillId as unknown as string,
        payload: {
          targetId: 'new-file-id',
          item: {
            id: 'new-file-id',
            path: 'helper.ts',
            content: 'console.log("hello")',
            permissions: 'read',
            isBase64: false,
          },
        },
        captureMode: ChangeProposalCaptureMode.commit,
      };

      await useCase.execute(
        command as unknown as CreateChangeProposalCommand<ChangeProposalType>,
      );

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.addSkillFile,
        }),
        3,
      );
    });
  });

  describe('when type is updateSkillFilePermissions', () => {
    const skillFileId = createSkillFileId('file-1');
    const skillVersionId = createSkillVersionId('version-1');

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      skillsPort.getSkill.mockResolvedValue(skill);
      skillsPort.getLatestSkillVersion.mockResolvedValue({
        id: skillVersionId,
        skillId,
        version: 3,
        userId,
        name: 'My Skill',
        slug: 'my-skill',
        description: 'Skill description',
        prompt: 'Skill prompt',
      });
      skillsPort.getSkillFiles.mockResolvedValue([
        {
          id: skillFileId,
          skillVersionId,
          path: 'helper.ts',
          content: 'content',
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
      service.createChangeProposal.mockResolvedValue({
        changeProposal:
          {} as CreateChangeProposalResponse<ChangeProposalType.updateSkillFilePermissions>['changeProposal'],
      });
    });

    it('delegates to service with skill version', async () => {
      const command = {
        userId,
        organizationId,
        spaceId,
        type: ChangeProposalType.updateSkillFilePermissions,
        artefactId: skillId as unknown as string,
        payload: {
          targetId: skillFileId,
          oldValue: 'rw-r--r--',
          newValue: 'rwxr-xr-x',
        },
        captureMode: ChangeProposalCaptureMode.commit,
      };

      await useCase.execute(
        command as unknown as CreateChangeProposalCommand<ChangeProposalType>,
      );

      expect(service.createChangeProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateSkillFilePermissions,
        }),
        3,
      );
    });

    describe('when oldValue does not match', () => {
      it('throws ChangeProposalPayloadMismatchError', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.updateSkillFilePermissions,
          artefactId: skillId as unknown as string,
          payload: {
            targetId: skillFileId,
            oldValue: 'r--r--r--',
            newValue: 'rwxr-xr-x',
          },
          captureMode: ChangeProposalCaptureMode.commit,
        };

        await expect(
          useCase.execute(
            command as unknown as CreateChangeProposalCommand<ChangeProposalType>,
          ),
        ).rejects.toBeInstanceOf(ChangeProposalPayloadMismatchError);
      });
    });
  });

  describe('when a pending duplicate exists', () => {
    const command = buildCommand();

    const existingProposal: ChangeProposal<ChangeProposalType> = {
      id: createChangeProposalId(),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      artefactVersion: 5,
      spaceId,
      payload: { oldValue: recipe.name, newValue: 'New Recipe Name' },
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId('user-id'),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
      service.findExistingPending.mockResolvedValue(existingProposal);
    });

    it('returns the existing proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposal).toBe(existingProposal);
    });

    it('returns wasCreated false', async () => {
      const result = await useCase.execute(command);

      expect(result.wasCreated).toBe(false);
    });

    it('does not call createChangeProposal', async () => {
      await useCase.execute(command);

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when type is unsupported', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateStandardName as unknown as ChangeProposalType.updateCommandName,
    });

    it('throws UnsupportedChangeProposalTypeError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UnsupportedChangeProposalTypeError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when recipe is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeById.mockResolvedValue(null);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        `Recipe ${recipeId} not found`,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when payload oldValue does not match current recipe name', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateCommandName,
      payload: { oldValue: 'Wrong Name', newValue: 'New Name' },
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when payload oldValue does not match current recipe content', () => {
    const command = buildCommand({
      type: ChangeProposalType.updateCommandDescription as unknown as ChangeProposalType.updateCommandName,
      payload: { oldValue: 'wrong content', newValue: 'new content' },
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      recipesPort.getRecipeById.mockResolvedValue(recipe);
    });

    it('throws ChangeProposalPayloadMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ChangeProposalPayloadMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });
  });

  describe('when space is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });

    it('does not call getRecipeById', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(recipesPort.getRecipeById).not.toHaveBeenCalled();
    });
  });

  describe('when space does not belong to the organization', () => {
    const command = buildCommand();
    const otherOrgSpace = spaceFactory({
      id: spaceId,
      organizationId: createOrganizationId('other-org-id'),
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(otherOrgSpace);
    });

    it('throws an error', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceOwnershipMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.createChangeProposal).not.toHaveBeenCalled();
    });

    it('does not call getRecipeById', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(recipesPort.getRecipeById).not.toHaveBeenCalled();
    });
  });
});
