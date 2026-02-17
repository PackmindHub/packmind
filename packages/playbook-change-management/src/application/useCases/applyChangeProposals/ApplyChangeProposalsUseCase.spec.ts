import { stubLogger } from '@packmind/test-utils';
import {
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  IPlaybookChangeManagementPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  RecipeId,
  ChangeProposalType,
  StandardId,
  SkillId,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { changeProposalFactory } from '@packmind/playbook-change-management/test/changeProposalFactory';
import { ApplyChangeProposalsUseCase } from './ApplyChangeProposalsUseCase';
import { ChangeProposalService } from '../../services/ChangeProposalService';

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
  let playbookChangeManagementPort: jest.Mocked<IPlaybookChangeManagementPort>;

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
    } as unknown as jest.Mocked<IRecipesPort>;

    skillsPort = {
      getSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    changeProposalService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    playbookChangeManagementPort = {
      applyCommandChangeProposal: jest.fn(),
      rejectCommandChangeProposal: jest.fn(),
    } as unknown as jest.Mocked<IPlaybookChangeManagementPort>;

    useCase = new ApplyChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      standardsPort,
      recipesPort,
      skillsPort,
      changeProposalService,
      playbookChangeManagementPort,
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
    });
    const changeProposal2 = changeProposalFactory({
      id: createChangeProposalId('cp-2'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById
        .mockResolvedValueOnce(changeProposal1)
        .mockResolvedValueOnce(changeProposal2);
      playbookChangeManagementPort.applyCommandChangeProposal.mockResolvedValue(
        { changeProposal: changeProposal1 },
      );
    });

    it('returns success for all accepted proposals', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(result.success).toEqual([changeProposal1.id, changeProposal2.id]);
    });

    it('returns empty failure array', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(result.failure).toEqual([]);
    });

    it('calls applyCommandChangeProposal for each accepted proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id],
        rejected: [],
      });

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('when rejecting recipe change proposals successfully', () => {
    const changeProposal1 = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
    });
    const changeProposal2 = changeProposalFactory({
      id: createChangeProposalId('cp-2'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById
        .mockResolvedValueOnce(changeProposal1)
        .mockResolvedValueOnce(changeProposal2);
      playbookChangeManagementPort.rejectCommandChangeProposal.mockResolvedValue(
        { changeProposal: changeProposal1 },
      );
    });

    it('returns success for all rejected proposals', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(result.success).toEqual([changeProposal1.id, changeProposal2.id]);
    });

    it('returns empty failure array for rejected proposals', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(result.failure).toEqual([]);
    });

    it('calls rejectCommandChangeProposal for each rejected proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [changeProposal1.id, changeProposal2.id],
      });

      expect(
        playbookChangeManagementPort.rejectCommandChangeProposal,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('when applying standard change proposals', () => {
    const standardId = createStandardId('standard-id');
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.addRule,
      artefactId: standardId,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
      standardsPort.getStandard.mockResolvedValue({
        id: standardId,
        spaceId,
      } as never);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
    });

    it('returns error for standard change proposals', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: standardId,
        accepted: [changeProposal.id],
        rejected: [],
      });

      expect(result.failure).toEqual([
        {
          id: changeProposal.id,
          message: 'Standard change proposals are not supported yet',
        },
      ]);
    });

    it('does not call applyCommandChangeProposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: standardId,
        accepted: [changeProposal.id],
        rejected: [],
      });

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when applying skill change proposals', () => {
    const skillId = createSkillId('skill-id');
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateSkillName,
      artefactId: skillId,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(changeProposal);
      skillsPort.getSkill.mockResolvedValue({
        id: skillId,
        spaceId,
      } as never);
      recipesPort.getRecipeByIdInternal.mockResolvedValue(null);
    });

    it('returns error for skill change proposals', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: skillId,
        accepted: [changeProposal.id],
        rejected: [],
      });

      expect(result.failure).toEqual([
        {
          id: changeProposal.id,
          message: 'Skill change proposals are not supported yet',
        },
      ]);
    });

    it('does not call applyCommandChangeProposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: skillId,
        accepted: [changeProposal.id],
        rejected: [],
      });

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when change proposal is not found', () => {
    const changeProposalId = createChangeProposalId('cp-not-found');

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(null);
    });

    it('returns error for missing change proposal', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposalId],
        rejected: [],
      });

      expect(result.failure).toEqual([
        {
          id: changeProposalId,
          message: 'Change proposal not found',
        },
      ]);
    });
  });

  describe('when change proposal does not belong to artefact', () => {
    const differentRecipeId = createRecipeId('different-recipe');
    const changeProposal = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: differentRecipeId,
      spaceId,
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

  describe('when applying mixed proposals with partial failures', () => {
    const changeProposal1 = changeProposalFactory({
      id: createChangeProposalId('cp-1'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
    });
    const changeProposal2 = changeProposalFactory({
      id: createChangeProposalId('cp-2'),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      spaceId,
    });
    const changeProposal3 = changeProposalFactory({
      id: createChangeProposalId('cp-3'),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById
        .mockResolvedValueOnce(changeProposal1)
        .mockResolvedValueOnce(changeProposal2)
        .mockResolvedValueOnce(changeProposal3);

      playbookChangeManagementPort.applyCommandChangeProposal
        .mockResolvedValueOnce({ changeProposal: changeProposal1 })
        .mockRejectedValueOnce(new Error('Application failed'))
        .mockResolvedValueOnce({ changeProposal: changeProposal3 });
    });

    it('returns successful proposals in success array', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id, changeProposal3.id],
        rejected: [],
      });

      expect(result.success).toEqual([changeProposal1.id, changeProposal3.id]);
    });

    it('returns failed proposals in failure array', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [changeProposal1.id, changeProposal2.id, changeProposal3.id],
        rejected: [],
      });

      expect(result.failure).toEqual([
        {
          id: changeProposal2.id,
          message: 'Application failed',
        },
      ]);
    });
  });

  describe('when no change proposals are provided', () => {
    it('returns empty success array', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [],
      });

      expect(result.success).toEqual([]);
    });

    it('returns empty failure array', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [],
      });

      expect(result.failure).toEqual([]);
    });

    it('does not call applyCommandChangeProposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        artefactId: recipeId,
        accepted: [],
        rejected: [],
      });

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).not.toHaveBeenCalled();
    });
  });
});
