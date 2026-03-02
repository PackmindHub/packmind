import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISpacesPort,
  NewCommandPayload,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { recipeFactory } from '@packmind/recipes/test/recipeFactory';
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
        userId,
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

    it('tracks change_proposal_accepted event', async () => {
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
            itemType: 'command',
            changeType: ChangeProposalType.createCommand,
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

    it('tracks change_proposal_rejected event', async () => {
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
            itemType: 'command',
            changeType: ChangeProposalType.createCommand,
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

  describe('when proposal is not a createCommand type', () => {
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
        `Change proposal ${proposalId} is not a createCommand proposal (type: updateCommandName)`,
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
});
