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

    useCase = new ApplyCreationChangeProposalsUseCase(
      accountsPort,
      spacesPort,
      recipesPort,
      changeProposalService,
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

      expect(result.created).toEqual([recipeId]);
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

      expect(result.created).toEqual([]);
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
});
