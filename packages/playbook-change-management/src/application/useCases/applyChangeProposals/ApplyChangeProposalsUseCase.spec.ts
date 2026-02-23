import { stubLogger } from '@packmind/test-utils';
import {
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  RecipeId,
  ChangeProposalType,
  StandardId,
  SkillId,
  ChangeProposalStatus,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { changeProposalFactory } from '@packmind/playbook-change-management/test/changeProposalFactory';
import { ApplyChangeProposalsUseCase } from './ApplyChangeProposalsUseCase';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { skillVersionFactory } from '@packmind/skills/test';

describe('ApplyChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');
  const recipeId = createRecipeId('recipe-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });
  const recipe = recipeFactory({ id: recipeId, spaceId });

  let useCase: ApplyChangeProposalsUseCase<StandardId | RecipeId | SkillId>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let changeProposalService: jest.Mocked<ChangeProposalService>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    standardsPort = {
      getStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      getRecipeByIdInternal: jest.fn(),
      updateRecipeFromUI: jest.fn(),
      getRecipeVersion: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      getSkill: jest.fn(),
      getLatestSkillVersion: jest.fn(),
      getSkillFiles: jest.fn(),
      saveSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    changeProposalService = {
      findById: jest.fn(),
      batchUpdateProposalsInTransaction: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new ApplyChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
    spacesPort.getSpaceById.mockResolvedValue(space);
    standardsPort.getStandard.mockResolvedValue(null);
    recipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);
    skillsPort.getSkill.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when applying recipe change proposals successfully', () => {
    const changeProposal1 = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: { oldValue: 'Test Recipe', newValue: 'Updated Recipe Name' },
    });
    const changeProposal2 = changeProposalFactory({
      id: createChangeProposalId('cp-2'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: { oldValue: 'Test content', newValue: 'Updated content' },
    });

    const recipeVersionId = createRecipeVersionId('recipe-version-1');
    const recipeVersion = recipeVersionFactory({
      id: recipeVersionId,
      recipeId,
      version: 2,
      content: 'Test content',
    });

    beforeEach(() => {
      // Mock findById for initial validation (2 calls) + fresh validation (2 calls)
      changeProposalService.findById
        .mockResolvedValueOnce(changeProposal1) // Initial validation - cp-1
        .mockResolvedValueOnce(changeProposal2) // Initial validation - cp-2
        .mockResolvedValueOnce(changeProposal1) // Fresh validation - cp-1
        .mockResolvedValueOnce(changeProposal2); // Fresh validation - cp-2

      recipesPort.updateRecipeFromUI.mockResolvedValue({
        recipe: { ...recipe, version: 2 },
      });

      recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);

      changeProposalService.batchUpdateProposalsInTransaction.mockResolvedValue(
        undefined,
      );
    });

    it('returns new recipe version ID', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(result.newArtefactVersion).toEqual(recipeVersionId);
    });

    it('calls updateRecipeFromUI once', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(recipesPort.updateRecipeFromUI).toHaveBeenCalledTimes(1);
    });

    it('calls batchUpdateProposalsInTransaction once', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledTimes(1);
    });

    it('calls batchUpdateProposalsInTransaction with accepted proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [
          { proposal: changeProposal1, userId },
          { proposal: changeProposal2, userId },
        ],
        rejectedProposals: [],
      });
    });
  });

  describe('when rejecting recipe change proposals successfully', () => {
    const changeProposal1 = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
    });
    const changeProposal2 = changeProposalFactory({
      id: createChangeProposalId('cp-2'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
    });

    const recipeVersionId = createRecipeVersionId('recipe-version-1');
    const recipeVersion = recipeVersionFactory({
      id: recipeVersionId,
      recipeId,
      version: 1, // Current version (no update)
    });

    beforeEach(() => {
      // Mock findById for initial validation (2 calls) + fresh validation (2 calls)
      changeProposalService.findById
        .mockResolvedValueOnce(changeProposal1) // Initial validation - cp-1
        .mockResolvedValueOnce(changeProposal2) // Initial validation - cp-2
        .mockResolvedValueOnce(changeProposal1) // Fresh validation - cp-1
        .mockResolvedValueOnce(changeProposal2); // Fresh validation - cp-2

      recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);

      changeProposalService.batchUpdateProposalsInTransaction.mockResolvedValue(
        undefined,
      );
    });

    it('returns current recipe version ID', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(result.newArtefactVersion).toEqual(recipeVersionId);
    });

    it('does not call updateRecipeFromUI', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(recipesPort.updateRecipeFromUI).not.toHaveBeenCalled();
    });

    it('calls batchUpdateProposalsInTransaction once', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledTimes(1);
    });

    it('calls batchUpdateProposalsInTransaction with rejected proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [],
        rejectedProposals: [
          { proposal: changeProposal1, userId },
          { proposal: changeProposal2, userId },
        ],
      });
    });
  });

  describe('when applying standard change proposals', () => {
    const standardId = createStandardId('standard-id');
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.addRule,
      artefactId: standardId,
      spaceId,
      status: ChangeProposalStatus.pending,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
      standardsPort.getStandard.mockResolvedValue({
        id: standardId,
        spaceId,
      } as never);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
    });

    it('throws error for standard change proposals', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          artefactId: standardId,
          accepted: [changeProposal.id],
          rejected: [],
        }),
      ).rejects.toThrow('Unable to find a valid applier for changes: addRule');
    });

    it('does not call updateRecipeFromUI', async () => {
      await useCase
        .execute({
          userId,
          organizationId,
          spaceId,
          artefactId: standardId,
          accepted: [changeProposal.id],
          rejected: [],
        })
        .catch(() => {
          /* expected error */
        });

      expect(recipesPort.updateRecipeFromUI).not.toHaveBeenCalled();
    });
  });

  describe('when applying skill change proposals', () => {
    const skillId = createSkillId('skill-id');
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateSkillName,
      artefactId: skillId,
      payload: {
        oldValue: 'the old value',
        newValue: 'the new value',
      },
      spaceId,
      status: ChangeProposalStatus.pending,
    });

    const skillVersion = skillVersionFactory({
      skillId,
      version: 1,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
      skillsPort.getSkill.mockResolvedValue({
        id: skillId,
        spaceId,
      } as never);
      skillsPort.getLatestSkillVersion.mockResolvedValue(skillVersion);
      skillsPort.getSkillFiles.mockResolvedValue([]);
      skillsPort.saveSkillVersion.mockResolvedValue(skillVersion);
    });

    it('calls skillsPort.save skill with the updated version', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: skillId,
        accepted: [changeProposal.id],
        rejected: [],
      });
      expect(skillsPort.saveSkillVersion).toHaveBeenCalledWith({
        userId,
        spaceId,
        organizationId,
        skillVersion: {
          ...skillVersion,
          files: [],
          name: 'the new value',
        },
      });
    });
  });

  describe('when change proposal is not found', () => {
    const changeProposalId = createChangeProposalId('cp-not-found');

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(null);
    });

    it('throws error for missing change proposal', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          artefactId: recipeId,
          accepted: [changeProposalId],
          rejected: [],
        }),
      ).rejects.toThrow(`Change proposal ${changeProposalId} not found`);
    });
  });

  describe('when change proposal does not belong to artefact', () => {
    const differentRecipeId = createRecipeId('different-recipe');
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: differentRecipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
    });

    it('throws an error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          artefactId: recipeId,
          accepted: [changeProposal.id],
          rejected: [],
        }),
      ).rejects.toThrow(
        `Change proposal ${changeProposal.id} does not belong to artefact ${recipeId}`,
      );
    });
  });

  describe('when change proposal is not pending', () => {
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.applied,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
    });

    it('throws an error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          artefactId: recipeId,
          accepted: [changeProposal.id],
          rejected: [],
        }),
      ).rejects.toThrow(
        `Change proposal ${changeProposal.id} is not pending (status: applied)`,
      );
    });
  });

  describe('when space does not belong to organization', () => {
    const differentOrgId = createOrganizationId('different-org');

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue({
        ...space,
        organizationId: differentOrgId,
      });
    });

    it('throws an error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          artefactId: recipeId,
          accepted: [],
          rejected: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('when artefact does not belong to space', () => {
    const differentSpaceId = createSpaceId('different-space');

    beforeEach(() => {
      recipesPort.getRecipeByIdInternal.mockResolvedValue({
        ...recipe,
        spaceId: differentSpaceId,
      });
    });

    it('throws an error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          artefactId: recipeId,
          accepted: [],
          rejected: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('when applying change proposals with conflicts', () => {
    const changeProposal1 = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: { oldValue: 'Old Name', newValue: 'New Name' },
    });
    const changeProposal2 = changeProposalFactory({
      id: createChangeProposalId('cp-2'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: { oldValue: 'Old description', newValue: 'Conflicting change' },
    });

    beforeEach(() => {
      // Only mock for initial validation since conflict will be detected before fresh validation
      changeProposalService.findById
        .mockResolvedValueOnce(changeProposal1)
        .mockResolvedValueOnce(changeProposal2);
    });

    describe('when conflict detected', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            userId,
            organizationId,
            spaceId,
            artefactId: recipeId,
            accepted: [changeProposal1.id, changeProposal2.id],
            rejected: [],
          }),
        ).rejects.toThrow();
      });

      it('does not update recipe', async () => {
        await useCase
          .execute({
            userId,
            organizationId,
            spaceId,
            artefactId: recipeId,
            accepted: [changeProposal1.id, changeProposal2.id],
            rejected: [],
          })
          .catch(() => {
            /* expected error */
          });

        expect(recipesPort.updateRecipeFromUI).not.toHaveBeenCalled();
      });

      it('does not call batchUpdateProposalsInTransaction', async () => {
        await useCase
          .execute({
            userId,
            organizationId,
            spaceId,
            artefactId: recipeId,
            accepted: [changeProposal1.id, changeProposal2.id],
            rejected: [],
          })
          .catch(() => {
            /* expected error */
          });

        expect(
          changeProposalService.batchUpdateProposalsInTransaction,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('when no change proposals are provided', () => {
    const recipeVersionId = createRecipeVersionId('recipe-version-1');
    const recipeVersion = recipeVersionFactory({
      id: recipeVersionId,
      recipeId,
      version: 1,
    });

    beforeEach(() => {
      recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);
      changeProposalService.batchUpdateProposalsInTransaction.mockResolvedValue(
        undefined,
      );
    });

    it('returns current recipe version ID', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [],
      });

      expect(result.newArtefactVersion).toEqual(recipeVersionId);
    });

    it('does not call updateRecipeFromUI', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [],
      });

      expect(recipesPort.updateRecipeFromUI).not.toHaveBeenCalled();
    });

    it('calls batchUpdateProposalsInTransaction with empty arrays', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [],
        rejectedProposals: [],
      });
    });
  });
});
