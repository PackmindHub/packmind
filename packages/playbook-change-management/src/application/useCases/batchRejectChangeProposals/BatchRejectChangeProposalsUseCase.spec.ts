import { stubLogger } from '@packmind/test-utils';
import {
  BatchRejectChangeProposalItem,
  BatchRejectChangeProposalsCommand,
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  IPlaybookChangeManagementPort,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { BatchRejectChangeProposalsUseCase } from './BatchRejectChangeProposalsUseCase';

describe('BatchRejectChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });

  let useCase: BatchRejectChangeProposalsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let playbookChangeManagementPort: jest.Mocked<IPlaybookChangeManagementPort>;

  const buildProposalItem = (
    overrides?: Partial<BatchRejectChangeProposalItem>,
  ): BatchRejectChangeProposalItem => ({
    changeProposalId: createChangeProposalId('change-proposal-1'),
    recipeId: createRecipeId('recipe-1'),
    ...overrides,
  });

  const buildCommand = (
    proposals: BatchRejectChangeProposalItem[] = [],
  ): BatchRejectChangeProposalsCommand => ({
    userId,
    organizationId,
    spaceId,
    proposals,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    playbookChangeManagementPort = {
      rejectCommandChangeProposal: jest.fn(),
    } as unknown as jest.Mocked<IPlaybookChangeManagementPort>;

    useCase = new BatchRejectChangeProposalsUseCase(
      accountsPort,
      playbookChangeManagementPort,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when all proposals are rejected successfully', () => {
    const proposals = [
      buildProposalItem({
        changeProposalId: createChangeProposalId('cp-1'),
        recipeId: createRecipeId('recipe-1'),
      }),
      buildProposalItem({
        changeProposalId: createChangeProposalId('cp-2'),
        recipeId: createRecipeId('recipe-2'),
      }),
      buildProposalItem({
        changeProposalId: createChangeProposalId('cp-3'),
        recipeId: createRecipeId('recipe-3'),
      }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      playbookChangeManagementPort.rejectCommandChangeProposal.mockResolvedValue(
        undefined as never,
      );
    });

    it('returns rejected count matching the number of proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.rejected).toBe(3);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('calls rejectCommandChangeProposal for each proposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.rejectCommandChangeProposal,
      ).toHaveBeenCalledTimes(3);
    });

    it('passes the correct command for each proposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.rejectCommandChangeProposal,
      ).toHaveBeenCalledWith({
        userId,
        organizationId,
        spaceId,
        recipeId: createRecipeId('recipe-1'),
        changeProposalId: createChangeProposalId('cp-1'),
      });
    });
  });

  describe('when one proposal fails', () => {
    const proposals = [
      buildProposalItem({
        changeProposalId: createChangeProposalId('cp-1'),
        recipeId: createRecipeId('recipe-1'),
      }),
      buildProposalItem({
        changeProposalId: createChangeProposalId('cp-2'),
        recipeId: createRecipeId('recipe-2'),
      }),
      buildProposalItem({
        changeProposalId: createChangeProposalId('cp-3'),
        recipeId: createRecipeId('recipe-3'),
      }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      playbookChangeManagementPort.rejectCommandChangeProposal
        .mockResolvedValueOnce(undefined as never)
        .mockRejectedValueOnce(new Error('Proposal not found'))
        .mockResolvedValueOnce(undefined as never);
    });

    it('adds the error with the correct item index', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([
        { index: 1, message: 'Proposal not found' },
      ]);
    });

    it('still rejects the other proposals successfully', async () => {
      const result = await useCase.execute(command);

      expect(result.rejected).toBe(2);
    });

    it('calls rejectCommandChangeProposal for all proposals', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.rejectCommandChangeProposal,
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe('when proposals array is empty', () => {
    const command = buildCommand([]);

    it('returns zero rejected', async () => {
      const result = await useCase.execute(command);

      expect(result.rejected).toBe(0);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('does not call rejectCommandChangeProposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.rejectCommandChangeProposal,
      ).not.toHaveBeenCalled();
    });
  });
});
