import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
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
  NewCommandPayload,
  NewSkillPayload,
  NewStandardPayload,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
import { standardFactory } from '@packmind/standards/test/standardFactory';
import { skillFactory } from '@packmind/skills/test/skillFactory';
import { changeProposalFactory } from '@packmind/playbook-change-management/test/changeProposalFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ApplyCreationChangeProposalsUseCase } from './ApplyCreationChangeProposalsUseCase';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: {
    publishChangeProposalUpdateEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('ApplyCreationChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('org-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');
  const proposalId = createChangeProposalId('proposal-1');
  const recipeId = createRecipeId('new-recipe');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });
  const recipe = recipeFactory({ id: recipeId, spaceId });

  const payload: NewCommandPayload = {
    name: 'My Command',
    content: 'Do something',
  };
  const proposal = changeProposalFactory({
    id: proposalId,
    type: ChangeProposalType.createCommand,
    artefactId: null,
    payload,
    status: ChangeProposalStatus.pending,
    spaceId,
  });

  let useCase: ApplyCreationChangeProposalsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let recipesPort: jest.Mocked<IRecipesPort>;
  let standardsPort: jest.Mocked<IStandardsPort>;
  let skillsPort: jest.Mocked<ISkillsPort>;
  let changeProposalService: jest.Mocked<ChangeProposalService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(space),
    } as unknown as jest.Mocked<ISpacesPort>;

    recipesPort = {
      captureRecipe: jest.fn().mockResolvedValue(recipe),
    } as unknown as jest.Mocked<IRecipesPort>;

    standardsPort = {
      createStandardWithExamples: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    skillsPort = {
      uploadSkill: jest.fn(),
    } as unknown as jest.Mocked<ISkillsPort>;

    changeProposalService = {
      findById: jest.fn().mockResolvedValue(proposal),
      batchUpdateProposalsInTransaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ChangeProposalService>;

    eventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new ApplyCreationChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      recipesPort,
      standardsPort,
      skillsPort,
      changeProposalService,
      eventEmitterService,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when accepting a createCommand proposal', () => {
    it('creates a recipe via recipesPort', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [],
      });

      expect(recipesPort.captureRecipe).toHaveBeenCalledWith({
        userId: proposal.createdBy,
        organizationId,
        spaceId,
        name: payload.name,
        content: payload.content,
      });
    });

    it('returns the created recipe id', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [],
      });

      expect(result.created).toEqual({
        commands: [recipeId],
        standards: [],
        skills: [],
      });
    });

    it('returns empty rejected list', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [],
      });

      expect(result.rejected).toEqual([]);
    });

    it('calls batchUpdateProposalsInTransaction with accepted proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [{ proposal, userId }],
        rejectedProposals: [],
      });
    });

    it('emits accepted event with itemType, changeType, and created artefact id', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            userId: userId,
            itemType: 'command',
            changeType: ChangeProposalType.createCommand,
            itemId: recipeId,
          }),
        }),
      );
    });
  });

  describe('when rejecting a createCommand proposal', () => {
    it('does not create any recipe', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [proposalId],
      });

      expect(recipesPort.captureRecipe).not.toHaveBeenCalled();
    });

    it('returns empty created list', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [proposalId],
      });

      expect(result.created).toEqual({
        commands: [],
        standards: [],
        skills: [],
      });
    });

    it('returns the rejected proposal id', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [proposalId],
      });

      expect(result.rejected).toEqual([proposalId]);
    });

    it('calls batchUpdateProposalsInTransaction with rejected proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [proposalId],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [],
        rejectedProposals: [{ proposal, userId }],
      });
    });

    it('emits rejected event with itemType and changeType', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [proposalId],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            userId: userId,
            itemType: 'command',
            changeType: ChangeProposalType.createCommand,
            itemId: '',
          }),
        }),
      );
    });
  });

  describe('when proposal is not pending', () => {
    it('throws an error', async () => {
      changeProposalService.findById.mockResolvedValue({
        ...proposal,
        status: ChangeProposalStatus.applied,
      });

      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalId],
          rejected: [],
        }),
      ).rejects.toThrow(
        `Change proposal ${proposalId} is not pending (status: applied)`,
      );
    });
  });

  describe('when proposal is not a supported creation type', () => {
    it('throws an error', async () => {
      changeProposalService.findById.mockResolvedValue({
        ...proposal,
        type: ChangeProposalType.updateCommandName,
      });

      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalId],
          rejected: [],
        }),
      ).rejects.toThrow(
        `Change proposal ${proposalId} has unsupported type for creation (type: updateCommandName)`,
      );
    });
  });

  describe('when proposal is not found', () => {
    it('throws an error', async () => {
      changeProposalService.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalId],
          rejected: [],
        }),
      ).rejects.toThrow(`Change proposal ${proposalId} not found`);
    });
  });

  describe('when space does not belong to organization', () => {
    it('throws an error', async () => {
      spacesPort.getSpaceById.mockResolvedValue({
        ...space,
        organizationId: createOrganizationId('different-org'),
      });

      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalId],
          rejected: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('when both accepted and rejected lists are empty', () => {
    it('returns empty created and rejected lists', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [],
      });

      expect(result.created).toEqual({
        commands: [],
        standards: [],
        skills: [],
      });
    });

    it('returns empty rejected list', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [],
      });

      expect(result.rejected).toEqual([]);
    });

    it('calls batchUpdateProposalsInTransaction with empty proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
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

  describe('when accepting multiple createCommand proposals', () => {
    it('creates all recipes and returns all created IDs', async () => {
      const proposalId2 = createChangeProposalId('proposal-2');
      const recipeId2 = createRecipeId('recipe-2');
      const proposal2 = changeProposalFactory({
        id: proposalId2,
        type: ChangeProposalType.createCommand,
        artefactId: null,
        payload,
        status: ChangeProposalStatus.pending,
        spaceId,
      });
      const recipe2 = recipeFactory({ id: recipeId2, spaceId });

      changeProposalService.findById
        .mockResolvedValueOnce(proposal)
        .mockResolvedValueOnce(proposal2);
      recipesPort.captureRecipe
        .mockResolvedValueOnce(recipe)
        .mockResolvedValueOnce(recipe2);

      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId, proposalId2],
        rejected: [],
      });

      expect(result.created).toEqual({
        commands: [recipeId, recipeId2],
        standards: [],
        skills: [],
      });
    });

    it('calls captureRecipe for each accepted proposal', async () => {
      const proposalId2 = createChangeProposalId('proposal-2');
      const proposal2 = changeProposalFactory({
        id: proposalId2,
        type: ChangeProposalType.createCommand,
        artefactId: null,
        payload,
        status: ChangeProposalStatus.pending,
        spaceId,
      });

      changeProposalService.findById
        .mockResolvedValueOnce(proposal)
        .mockResolvedValueOnce(proposal2);
      recipesPort.captureRecipe.mockResolvedValue(recipe);

      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId, proposalId2],
        rejected: [],
      });

      expect(recipesPort.captureRecipe).toHaveBeenCalledTimes(2);
    });
  });

  describe('when some proposals are accepted and others rejected', () => {
    it('creates recipes only for accepted proposals', async () => {
      const proposalId2 = createChangeProposalId('proposal-2');
      const proposal2 = changeProposalFactory({
        id: proposalId2,
        type: ChangeProposalType.createCommand,
        artefactId: null,
        payload,
        status: ChangeProposalStatus.pending,
        spaceId,
      });

      changeProposalService.findById
        .mockResolvedValueOnce(proposal)
        .mockResolvedValueOnce(proposal2);
      recipesPort.captureRecipe.mockResolvedValue(recipe);

      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [proposalId2],
      });

      expect(recipesPort.captureRecipe).toHaveBeenCalledTimes(1);
    });

    it('returns correct split of created and rejected', async () => {
      const proposalId2 = createChangeProposalId('proposal-2');
      const proposal2 = changeProposalFactory({
        id: proposalId2,
        type: ChangeProposalType.createCommand,
        artefactId: null,
        payload,
        status: ChangeProposalStatus.pending,
        spaceId,
      });

      changeProposalService.findById
        .mockResolvedValueOnce(proposal)
        .mockResolvedValueOnce(proposal2);
      recipesPort.captureRecipe.mockResolvedValue(recipe);

      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId],
        rejected: [proposalId2],
      });

      expect(result.rejected).toEqual([proposalId2]);
    });
  });

  describe('when captureRecipe fails', () => {
    beforeEach(() => {
      recipesPort.captureRecipe.mockRejectedValue(
        new Error('Recipe creation failed'),
      );
    });

    it('throws the captureRecipe error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalId],
          rejected: [],
        }),
      ).rejects.toThrow('Recipe creation failed');
    });

    it('does not call batchUpdateProposalsInTransaction', async () => {
      await useCase
        .execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalId],
          rejected: [],
        })
        .catch(() => undefined);

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when accepting a createStandard proposal', () => {
    const standardId = createStandardId('new-standard');
    const standardPayload: NewStandardPayload = {
      name: 'My Standard',
      description: 'A coding standard',
      scope: '*.ts',
      rules: [{ content: 'Use const for immutable variables' }],
    };
    const standardProposal = changeProposalFactory({
      id: createChangeProposalId('standard-proposal-1'),
      type: ChangeProposalType.createStandard,
      artefactId: null,
      payload: standardPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });
    const standard = standardFactory({ id: standardId, spaceId });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(standardProposal);
      standardsPort.createStandardWithExamples.mockResolvedValue(standard);
    });

    describe('when accepted', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [standardProposal.id],
          rejected: [],
        });
      });

      it('creates a standard via standardsPort', () => {
        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledWith({
          userId: standardProposal.createdBy,
          organizationId,
          spaceId,
          name: standardPayload.name,
          description: standardPayload.description,
          summary: null,
          scope: standardPayload.scope,
          rules: [{ content: 'Use const for immutable variables' }],
        });
      });

      it('returns the created standard id', () => {
        expect(result.created).toEqual({
          commands: [],
          standards: [standardId],
          skills: [],
        });
      });

      it('returns empty rejected list', () => {
        expect(result.rejected).toEqual([]);
      });

      it('calls batchUpdateProposalsInTransaction with accepted proposals', () => {
        expect(
          changeProposalService.batchUpdateProposalsInTransaction,
        ).toHaveBeenCalledWith({
          acceptedProposals: [{ proposal: standardProposal, userId }],
          rejectedProposals: [],
        });
      });

      it('emits accepted event with itemType, changeType, and created standard id', () => {
        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              userId: userId,
              itemType: 'standard',
              changeType: ChangeProposalType.createStandard,
              itemId: standardId,
            }),
          }),
        );
      });
    });

    describe('when scope is an array', () => {
      it('joins scope array with comma', async () => {
        const proposalWithArrayScope = changeProposalFactory({
          id: createChangeProposalId('standard-proposal-2'),
          type: ChangeProposalType.createStandard,
          artefactId: null,
          payload: {
            ...standardPayload,
            scope: ['*.ts', '*.tsx'],
          },
          status: ChangeProposalStatus.pending,
          spaceId,
        });

        changeProposalService.findById.mockResolvedValue(
          proposalWithArrayScope,
        );

        await useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalWithArrayScope.id],
          rejected: [],
        });

        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: '*.ts, *.tsx',
          }),
        );
      });
    });

    describe('when scope is null', () => {
      it('passes null scope', async () => {
        const proposalWithNullScope = changeProposalFactory({
          id: createChangeProposalId('standard-proposal-3'),
          type: ChangeProposalType.createStandard,
          artefactId: null,
          payload: {
            ...standardPayload,
            scope: null,
          },
          status: ChangeProposalStatus.pending,
          spaceId,
        });

        changeProposalService.findById.mockResolvedValue(proposalWithNullScope);

        await useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalWithNullScope.id],
          rejected: [],
        });

        expect(standardsPort.createStandardWithExamples).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: null,
          }),
        );
      });
    });
  });

  describe('when rejecting a createStandard proposal', () => {
    const standardPayload: NewStandardPayload = {
      name: 'My Standard',
      description: 'A coding standard',
      scope: '*.ts',
      rules: [{ content: 'Use const for immutable variables' }],
    };
    const standardProposal = changeProposalFactory({
      id: createChangeProposalId('standard-proposal-1'),
      type: ChangeProposalType.createStandard,
      artefactId: null,
      payload: standardPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(standardProposal);
    });

    it('does not create any standard', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [standardProposal.id],
      });

      expect(standardsPort.createStandardWithExamples).not.toHaveBeenCalled();
    });

    it('returns empty created list', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [standardProposal.id],
      });

      expect(result.created).toEqual({
        commands: [],
        standards: [],
        skills: [],
      });
    });

    it('returns the rejected proposal id', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [standardProposal.id],
      });

      expect(result.rejected).toEqual([standardProposal.id]);
    });

    it('calls batchUpdateProposalsInTransaction with rejected proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [standardProposal.id],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [],
        rejectedProposals: [{ proposal: standardProposal, userId }],
      });
    });
  });

  describe('when accepting mixed createCommand and createStandard proposals', () => {
    const standardId = createStandardId('new-standard');
    const standardPayload: NewStandardPayload = {
      name: 'My Standard',
      description: 'A coding standard',
      scope: '*.ts',
      rules: [{ content: 'Use const for immutable variables' }],
    };
    const standardProposal = changeProposalFactory({
      id: createChangeProposalId('standard-proposal-1'),
      type: ChangeProposalType.createStandard,
      artefactId: null,
      payload: standardPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });
    const standard = standardFactory({ id: standardId, spaceId });

    beforeEach(() => {
      changeProposalService.findById
        .mockResolvedValueOnce(proposal)
        .mockResolvedValueOnce(standardProposal);
      recipesPort.captureRecipe.mockResolvedValue(recipe);
      standardsPort.createStandardWithExamples.mockResolvedValue(standard);
    });

    it('returns both created command and standard IDs', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId, standardProposal.id],
        rejected: [],
      });

      expect(result.created).toEqual({
        commands: [recipeId],
        standards: [standardId],
        skills: [],
      });
    });

    it('calls captureRecipe for command proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId, standardProposal.id],
        rejected: [],
      });

      expect(recipesPort.captureRecipe).toHaveBeenCalledTimes(1);
    });

    it('calls createStandardWithExamples for standard proposal', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [proposalId, standardProposal.id],
        rejected: [],
      });

      expect(standardsPort.createStandardWithExamples).toHaveBeenCalledTimes(1);
    });
  });

  describe('when createStandardWithExamples fails', () => {
    const standardPayload: NewStandardPayload = {
      name: 'My Standard',
      description: 'A coding standard',
      scope: '*.ts',
      rules: [{ content: 'Use const for immutable variables' }],
    };
    const standardProposal = changeProposalFactory({
      id: createChangeProposalId('standard-proposal-1'),
      type: ChangeProposalType.createStandard,
      artefactId: null,
      payload: standardPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(standardProposal);
      standardsPort.createStandardWithExamples.mockRejectedValue(
        new Error('Standard creation failed'),
      );
    });

    it('throws the createStandardWithExamples error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [standardProposal.id],
          rejected: [],
        }),
      ).rejects.toThrow('Standard creation failed');
    });

    it('does not call batchUpdateProposalsInTransaction', async () => {
      await useCase
        .execute({
          userId,
          organizationId,
          spaceId,
          accepted: [standardProposal.id],
          rejected: [],
        })
        .catch(() => undefined);

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when accepting a createSkill proposal', () => {
    const skillId = createSkillId('new-skill');
    const skillPayload: NewSkillPayload = {
      name: 'My Skill',
      description: 'A coding skill',
      prompt: 'This is the skill prompt with instructions',
      skillMdPermissions: 'rw-r--r--',
      license: 'MIT',
      compatibility: '>=1.0.0',
    };
    const skillProposal = changeProposalFactory({
      id: createChangeProposalId('skill-proposal-1'),
      type: ChangeProposalType.createSkill,
      artefactId: null,
      payload: skillPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });
    const skill = skillFactory({ id: skillId, spaceId });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(skillProposal);
      skillsPort.uploadSkill.mockResolvedValue({
        skill,
        versionCreated: true,
      });
    });

    it('creates a skill via skillsPort', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [skillProposal.id],
        rejected: [],
      });

      expect(skillsPort.uploadSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: skillProposal.createdBy,
          organizationId,
          spaceId,
          files: expect.arrayContaining([
            expect.objectContaining({
              path: 'SKILL.md',
              isBase64: false,
            }),
          ]),
        }),
      );
    });

    describe('generated SKILL.md', () => {
      let skillMdFile: { path: string; content: string } | undefined;

      beforeEach(async () => {
        await useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [skillProposal.id],
          rejected: [],
        });

        const uploadCall = skillsPort.uploadSkill.mock.calls[0][0];
        skillMdFile = uploadCall.files.find((f) => f.path === 'SKILL.md');
      });

      it('includes skill name', () => {
        expect(skillMdFile?.content).toContain('name: My Skill');
      });

      it('includes skill description', () => {
        expect(skillMdFile?.content).toContain('description: A coding skill');
      });

      it('includes license', () => {
        expect(skillMdFile?.content).toContain('license: MIT');
      });

      it('includes compatibility', () => {
        expect(skillMdFile?.content).toContain('compatibility: >=1.0.0');
      });

      it('includes prompt in body', () => {
        expect(skillMdFile?.content).toContain(
          'This is the skill prompt with instructions',
        );
      });
    });

    it('returns the created skill id', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [skillProposal.id],
        rejected: [],
      });

      expect(result.created).toEqual({
        commands: [],
        standards: [],
        skills: [skillId],
      });
    });

    it('returns empty rejected list', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [skillProposal.id],
        rejected: [],
      });

      expect(result.rejected).toEqual([]);
    });

    it('calls batchUpdateProposalsInTransaction with accepted proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [skillProposal.id],
        rejected: [],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [{ proposal: skillProposal, userId }],
        rejectedProposals: [],
      });
    });

    it('emits accepted event with itemType, changeType, and created skill id', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [skillProposal.id],
        rejected: [],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            userId: userId,
            itemType: 'skill',
            changeType: ChangeProposalType.createSkill,
            itemId: skillId,
          }),
        }),
      );
    });

    describe('when payload includes additional files', () => {
      it('includes all files in upload', async () => {
        const proposalWithFiles = changeProposalFactory({
          id: createChangeProposalId('skill-proposal-2'),
          type: ChangeProposalType.createSkill,
          artefactId: null,
          payload: {
            ...skillPayload,
            files: [
              {
                path: 'helper.js',
                content: 'export function helper() {}',
                permissions: 'rw-r--r--',
                isBase64: false,
              },
            ],
          },
          status: ChangeProposalStatus.pending,
          spaceId,
        });

        changeProposalService.findById.mockResolvedValue(proposalWithFiles);

        await useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [proposalWithFiles.id],
          rejected: [],
        });

        expect(skillsPort.uploadSkill).toHaveBeenCalledWith(
          expect.objectContaining({
            files: expect.arrayContaining([
              expect.objectContaining({ path: 'SKILL.md' }),
              expect.objectContaining({ path: 'helper.js' }),
            ]),
          }),
        );
      });
    });
  });

  describe('when rejecting a createSkill proposal', () => {
    const skillPayload: NewSkillPayload = {
      name: 'My Skill',
      description: 'A coding skill',
      prompt: 'This is the skill prompt',
      skillMdPermissions: 'rw-r--r--',
    };
    const skillProposal = changeProposalFactory({
      id: createChangeProposalId('skill-proposal-1'),
      type: ChangeProposalType.createSkill,
      artefactId: null,
      payload: skillPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(skillProposal);
    });

    it('does not create any skill', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [skillProposal.id],
      });

      expect(skillsPort.uploadSkill).not.toHaveBeenCalled();
    });

    it('returns empty created list', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [skillProposal.id],
      });

      expect(result.created).toEqual({
        commands: [],
        standards: [],
        skills: [],
      });
    });

    it('returns the rejected proposal id', async () => {
      const result = await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [skillProposal.id],
      });

      expect(result.rejected).toEqual([skillProposal.id]);
    });

    it('calls batchUpdateProposalsInTransaction with rejected proposals', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [skillProposal.id],
      });

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).toHaveBeenCalledWith({
        acceptedProposals: [],
        rejectedProposals: [{ proposal: skillProposal, userId }],
      });
    });

    it('emits rejected event with itemType and changeType', async () => {
      await useCase.execute({
        userId,
        organizationId,
        spaceId,
        accepted: [],
        rejected: [skillProposal.id],
      });

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            userId: userId,
            itemType: 'skill',
            changeType: ChangeProposalType.createSkill,
            itemId: '',
          }),
        }),
      );
    });
  });

  describe('when uploadSkill fails', () => {
    const skillPayload: NewSkillPayload = {
      name: 'My Skill',
      description: 'A coding skill',
      prompt: 'This is the skill prompt',
      skillMdPermissions: 'rw-r--r--',
    };
    const skillProposal = changeProposalFactory({
      id: createChangeProposalId('skill-proposal-1'),
      type: ChangeProposalType.createSkill,
      artefactId: null,
      payload: skillPayload,
      status: ChangeProposalStatus.pending,
      spaceId,
    });

    beforeEach(() => {
      changeProposalService.findById.mockResolvedValue(skillProposal);
      skillsPort.uploadSkill.mockRejectedValue(
        new Error('Skill upload failed'),
      );
    });

    it('throws the uploadSkill error', async () => {
      await expect(
        useCase.execute({
          userId,
          organizationId,
          spaceId,
          accepted: [skillProposal.id],
          rejected: [],
        }),
      ).rejects.toThrow('Skill upload failed');
    });

    it('does not call batchUpdateProposalsInTransaction', async () => {
      await useCase
        .execute({
          userId,
          organizationId,
          spaceId,
          accepted: [skillProposal.id],
          rejected: [],
        })
        .catch(() => undefined);

      expect(
        changeProposalService.batchUpdateProposalsInTransaction,
      ).not.toHaveBeenCalled();
    });
  });
});
