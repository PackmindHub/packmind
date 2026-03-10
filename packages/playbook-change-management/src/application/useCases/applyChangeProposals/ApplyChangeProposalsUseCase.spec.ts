import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  AcceptedChangeProposal,
  ChangeProposal,
  ChangeProposalDecision,
  createChangeProposalId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  IDeploymentPort,
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

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: {
    publishChangeProposalUpdateEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

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

  function toAcceptedProposal<T extends ChangeProposalType>(
    baseProposal: ChangeProposal<T>,
    decision?: ChangeProposalDecision<T>,
  ): AcceptedChangeProposal<T> {
    return {
      ...baseProposal,
      status: ChangeProposalStatus.applied,
      decision: decision ?? (baseProposal.payload as ChangeProposalDecision<T>),
    } as AcceptedChangeProposal<T>;
  }

  let useCase: ApplyChangeProposalsUseCase<StandardId | RecipeId | SkillId>;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let deploymentPort: jest.Mocked<IDeploymentPort>;
  let changeProposalService: jest.Mocked<ChangeProposalService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;

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
      getLatestStandardVersion: jest.fn(),
      getRulesByStandardId: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    recipesPort = {
      getRecipeByIdInternal: jest.fn(),
      updateRecipeFromUI: jest.fn(),
      getRecipeVersion: jest.fn(),
      deleteRecipe: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      getSkill: jest.fn(),
      getLatestSkillVersion: jest.fn(),
      getSkillFiles: jest.fn(),
      saveSkillVersion: jest.fn(),
      deleteSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    deploymentPort = {
      getPackageById: jest.fn(),
      updatePackage: jest.fn(),
    } as unknown as jest.Mocked<IDeploymentPort>;

    changeProposalService = {
      findById: jest.fn(),
      batchUpdateProposalsInTransaction: jest.fn(),
      cancelPendingByArtefactId: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new ApplyChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      deploymentPort,
      changeProposalService,
      eventEmitterService,
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
        accepted: [
          toAcceptedProposal(changeProposal1),
          toAcceptedProposal(changeProposal2),
        ],
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
        accepted: [
          toAcceptedProposal(changeProposal1),
          toAcceptedProposal(changeProposal2),
        ],
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
        accepted: [
          toAcceptedProposal(changeProposal1),
          toAcceptedProposal(changeProposal2),
        ],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledTimes(1);
    });

    it('calls batchUpdateProposalsInTransaction with accepted proposals', async () => {
      const acceptedProposal1 = toAcceptedProposal(changeProposal1);
      const acceptedProposal2 = toAcceptedProposal(changeProposal2);

      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [acceptedProposal1, acceptedProposal2],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [
          { proposal: acceptedProposal1, userId },
          { proposal: acceptedProposal2, userId },
        ],
        rejectedProposals: [],
      });
    });

    it('tracks one change_proposal_accepted event per accepted proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [
          toAcceptedProposal(changeProposal1),
          toAcceptedProposal(changeProposal2),
        ],
        rejected: [],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledTimes(2);
    });

    it('tracks change_proposal_accepted event with correct payload', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [
          toAcceptedProposal(changeProposal1),
          toAcceptedProposal(changeProposal2),
        ],
        rejected: [],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            itemType: 'command',
            changeType: ChangeProposalType.updateCommandName,
          }),
        }),
      );
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

    it('tracks one change_proposal_rejected event per rejected proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledTimes(2);
    });

    it('tracks change_proposal_rejected event with correct payload', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            itemType: 'command',
            changeType: ChangeProposalType.updateCommandName,
          }),
        }),
      );
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

    const standardVersion = {
      id: 'standard-version-id',
      standardId,
      name: 'Test Standard',
      description: 'Test description',
      version: 1,
      slug: 'test-standard',
      scope: null,
      rules: [],
    };

    const updatedStandard = {
      id: standardId,
      name: standardVersion.name,
      version: 2,
      spaceId,
    };

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
      standardsPort.getStandard.mockResolvedValue({
        id: standardId,
        spaceId,
      } as never);
      standardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersion as never,
      );
      standardsPort.getRulesByStandardId.mockResolvedValue([]);
      standardsPort.updateStandard.mockResolvedValue(updatedStandard as never);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
      changeProposalService.batchUpdateProposalsInTransaction.mockResolvedValue();
    });

    it('returns the new artefact version', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: standardId,
        accepted: [toAcceptedProposal(changeProposal)],
        rejected: [],
      });

      expect(result.newArtefactVersion).toBe(standardVersion.id);
    });

    it('calls updateStandard', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: standardId,
        accepted: [toAcceptedProposal(changeProposal)],
        rejected: [],
      });

      expect(standardsPort.updateStandard).toHaveBeenCalled();
    });

    it('does not call updateRecipeFromUI', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: standardId,
        accepted: [toAcceptedProposal(changeProposal)],
        rejected: [],
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
        accepted: [toAcceptedProposal(changeProposal)],
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
    const changeProposal = changeProposalFactory({
      id: changeProposalId,
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: { oldValue: 'Test', newValue: 'Updated' },
    });

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
          accepted: [toAcceptedProposal(changeProposal)],
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
          accepted: [toAcceptedProposal(changeProposal)],
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
          accepted: [toAcceptedProposal(changeProposal)],
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
            accepted: [
              toAcceptedProposal(changeProposal1),
              toAcceptedProposal(changeProposal2),
            ],
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
            accepted: [
              toAcceptedProposal(changeProposal1),
              toAcceptedProposal(changeProposal2),
            ],
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
            accepted: [
              toAcceptedProposal(changeProposal1),
              toAcceptedProposal(changeProposal2),
            ],
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

  describe('when accepting a removeCommand proposal with delete decision', () => {
    const removeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-remove'),
      type: ChangeProposalType.removeCommand,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: {},
    });

    const recipeVersionId = createRecipeVersionId('recipe-version-1');
    const recipeVersion = recipeVersionFactory({
      id: recipeVersionId,
      recipeId,
      version: 1,
    });

    beforeEach(() => {
      changeProposalService.findById
        .mockResolvedValueOnce(removeProposal)
        .mockResolvedValueOnce(removeProposal);
      recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);
      recipesPort.deleteRecipe.mockResolvedValue({});
      changeProposalService.cancelPendingByArtefactId.mockResolvedValue(
        undefined,
      );
      changeProposalService.batchUpdateProposalsInTransaction.mockResolvedValue(
        undefined,
      );
    });

    it('calls deleteRecipe on the recipes port', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [toAcceptedProposal(removeProposal, { delete: true })],
        rejected: [],
      });

      expect(recipesPort.deleteRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId }),
      );
    });

    it('does not call updateRecipeFromUI', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [toAcceptedProposal(removeProposal, { delete: true })],
        rejected: [],
      });

      expect(recipesPort.updateRecipeFromUI).not.toHaveBeenCalled();
    });

    it('returns artefactDeleted true', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [toAcceptedProposal(removeProposal, { delete: true })],
        rejected: [],
      });

      expect(result.artefactDeleted).toBe(true);
    });

    it('cancels all other pending proposals for the artefact after deleting', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [toAcceptedProposal(removeProposal, { delete: true })],
        rejected: [],
      });

      expect(
        changeProposalService.cancelPendingByArtefactId,
      ).toHaveBeenCalledWith(spaceId, recipeId, userId);
    });
  });

  describe('when accepting a removeCommand proposal with removeFromPackages decision', () => {
    const packageId = createPackageId('pkg-1');
    const removeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-remove'),
      type: ChangeProposalType.removeCommand,
      artefactId: recipeId,
      spaceId,
      status: ChangeProposalStatus.pending,
      payload: {},
    });

    const recipeVersionId = createRecipeVersionId('recipe-version-1');
    const recipeVersion = recipeVersionFactory({
      id: recipeVersionId,
      recipeId,
      version: 1,
    });

    const pkg = {
      id: packageId,
      name: 'My Package',
      slug: 'my-package',
      description: 'desc',
      spaceId,
      createdBy: userId,
      recipes: [recipeId],
      standards: [],
      skills: [],
    };

    beforeEach(() => {
      changeProposalService.findById
        .mockResolvedValueOnce(removeProposal)
        .mockResolvedValueOnce(removeProposal);
      recipesPort.getRecipeVersion.mockResolvedValue(recipeVersion);
      deploymentPort.getPackageById.mockResolvedValue({ package: pkg });
      deploymentPort.updatePackage.mockResolvedValue({ package: pkg });
      changeProposalService.batchUpdateProposalsInTransaction.mockResolvedValue(
        undefined,
      );
    });

    it('does not call updateRecipeFromUI for a removal-only proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [
          toAcceptedProposal(removeProposal, {
            delete: false,
            removeFromPackages: [packageId],
          }),
        ],
        rejected: [],
      });

      expect(recipesPort.updateRecipeFromUI).not.toHaveBeenCalled();
    });

    it('calls getPackageById for each package to remove from', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [
          toAcceptedProposal(removeProposal, {
            delete: false,
            removeFromPackages: [packageId],
          }),
        ],
        rejected: [],
      });

      expect(deploymentPort.getPackageById).toHaveBeenCalledWith(
        expect.objectContaining({ packageId }),
      );
    });

    it('calls updatePackage without the recipe ID', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [
          toAcceptedProposal(removeProposal, {
            delete: false,
            removeFromPackages: [packageId],
          }),
        ],
        rejected: [],
      });

      expect(deploymentPort.updatePackage).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId,
          recipeIds: [],
        }),
      );
    });

    it('returns the updated package IDs', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [
          toAcceptedProposal(removeProposal, {
            delete: false,
            removeFromPackages: [packageId],
          }),
        ],
        rejected: [],
      });

      expect(result.updatedPackages).toEqual([packageId]);
    });
  });
});
