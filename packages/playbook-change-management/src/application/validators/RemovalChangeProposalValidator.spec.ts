import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createTargetId,
  createUserId,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  RemoveArtefactPayload,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { standardFactory } from '@packmind/standards/test/standardFactory';
import { skillFactory } from '@packmind/skills/test/skillFactory';
import { RemovalChangeProposalValidator } from './RemovalChangeProposalValidator';

describe('RemovalChangeProposalValidator', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('org-id');
  const spaceId = createSpaceId('space-id');
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });

  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let validator: RemovalChangeProposalValidator;

  beforeEach(() => {
    standardsPort = {
      getStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;
    recipesPort = {
      getRecipeById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;
    skillsPort = {
      getSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;
    validator = new RemovalChangeProposalValidator(
      standardsPort,
      recipesPort,
      skillsPort,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('supports()', () => {
    it('returns true for removeStandard', () => {
      expect(validator.supports(ChangeProposalType.removeStandard)).toBe(true);
    });

    it('returns true for removeCommand', () => {
      expect(validator.supports(ChangeProposalType.removeCommand)).toBe(true);
    });

    it('returns true for removeSkill', () => {
      expect(validator.supports(ChangeProposalType.removeSkill)).toBe(true);
    });

    it('returns false for createStandard', () => {
      expect(validator.supports(ChangeProposalType.createStandard)).toBe(false);
    });
  });

  describe('validate() for removeStandard', () => {
    const standardId = createStandardId('standard-id');
    const payload: RemoveArtefactPayload = {
      targetId: createTargetId('target-id'),
      packageIds: [createPackageId('package-id')],
    };

    describe('when standard exists', () => {
      beforeEach(() => {
        const standard = standardFactory({
          id: standardId,
          version: 3,
        });
        standardsPort.getStandard.mockResolvedValue(standard);
      });

      it('returns standard version', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeStandard,
          artefactId: standardId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 3 });
      });

      it('calls getStandard with correct ID', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeStandard,
          artefactId: standardId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        await validator.validate(command);

        expect(standardsPort.getStandard).toHaveBeenCalledWith(standardId);
      });
    });

    describe('when standard does not exist', () => {
      beforeEach(() => {
        standardsPort.getStandard.mockResolvedValue(null);
      });

      it('throws error', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeStandard,
          artefactId: standardId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        await expect(validator.validate(command)).rejects.toThrow(
          `Standard ${standardId} not found`,
        );
      });
    });
  });

  describe('validate() for removeCommand', () => {
    const recipeId = createRecipeId('recipe-id');
    const payload: RemoveArtefactPayload = {
      targetId: createTargetId('target-id'),
      packageIds: [createPackageId('package-id')],
    };

    describe('when recipe exists', () => {
      beforeEach(() => {
        const recipe = recipeFactory({
          id: recipeId,
          version: 2,
        });
        recipesPort.getRecipeById.mockResolvedValue(recipe);
      });

      it('returns recipe version', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeCommand,
          artefactId: recipeId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 2 });
      });

      it('calls getRecipeById with correct parameters', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeCommand,
          artefactId: recipeId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        await validator.validate(command);

        expect(recipesPort.getRecipeById).toHaveBeenCalledWith({
          userId,
          organizationId: organization.id,
          spaceId,
          recipeId,
        });
      });
    });

    describe('when recipe does not exist', () => {
      beforeEach(() => {
        recipesPort.getRecipeById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeCommand,
          artefactId: recipeId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        await expect(validator.validate(command)).rejects.toThrow(
          `Recipe ${recipeId} not found`,
        );
      });
    });
  });

  describe('validate() for removeSkill', () => {
    const skillId = createSkillId('skill-id');
    const payload: RemoveArtefactPayload = {
      targetId: createTargetId('target-id'),
      packageIds: [createPackageId('package-id')],
    };

    describe('when skill exists', () => {
      beforeEach(() => {
        const skill = skillFactory({
          id: skillId,
          version: 1,
        });
        skillsPort.getSkill.mockResolvedValue(skill);
      });

      it('returns skill version', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeSkill,
          artefactId: skillId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        const result = await validator.validate(command);

        expect(result).toEqual({ artefactVersion: 1 });
      });

      it('calls getSkill with correct ID', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeSkill,
          artefactId: skillId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        await validator.validate(command);

        expect(skillsPort.getSkill).toHaveBeenCalledWith(skillId);
      });
    });

    describe('when skill does not exist', () => {
      beforeEach(() => {
        skillsPort.getSkill.mockResolvedValue(null);
      });

      it('throws error', async () => {
        const command = {
          userId,
          organizationId,
          spaceId,
          type: ChangeProposalType.removeSkill,
          artefactId: skillId,
          payload,
          captureMode: ChangeProposalCaptureMode.commit,
          message: '',
          user,
          organization,
          membership: { userId, organizationId, role: 'member' as const },
        };

        await expect(validator.validate(command)).rejects.toThrow(
          `Skill ${skillId} not found`,
        );
      });
    });
  });
});
