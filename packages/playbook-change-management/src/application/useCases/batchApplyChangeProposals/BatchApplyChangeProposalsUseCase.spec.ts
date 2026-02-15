import { stubLogger } from '@packmind/test-utils';
import {
  BatchApplyChangeProposalItem,
  BatchApplyChangeProposalsCommand,
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
import { BatchApplyChangeProposalsUseCase } from './BatchApplyChangeProposalsUseCase';

describe('BatchApplyChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });

  let useCase: BatchApplyChangeProposalsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let playbookChangeManagementPort: jest.Mocked<IPlaybookChangeManagementPort>;

  const buildProposalItem = (
    overrides?: Partial<BatchApplyChangeProposalItem>,
  ): BatchApplyChangeProposalItem => ({
    changeProposalId: createChangeProposalId('change-proposal-1'),
    recipeId: createRecipeId('recipe-1'),
    force: false,
    ...overrides,
  });

  const buildCommand = (
    proposals: BatchApplyChangeProposalItem[] = [],
  ): BatchApplyChangeProposalsCommand => ({
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
      applyCommandChangeProposal: jest.fn(),
    } as unknown as jest.Mocked<IPlaybookChangeManagementPort>;

    useCase = new BatchApplyChangeProposalsUseCase(
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

  describe('when all proposals are applied successfully', () => {
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
      playbookChangeManagementPort.applyCommandChangeProposal.mockResolvedValue(
        {
          changeProposal: {} as never,
        },
      );
    });

    it('returns applied count matching the number of proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.applied).toBe(3);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('calls applyCommandChangeProposal for each proposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).toHaveBeenCalledTimes(3);
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
      playbookChangeManagementPort.applyCommandChangeProposal
        .mockResolvedValueOnce({ changeProposal: {} as never })
        .mockRejectedValueOnce(new Error('Change proposal not found'))
        .mockResolvedValueOnce({ changeProposal: {} as never });
    });

    it('adds the error with the correct item index', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([
        { index: 1, message: 'Change proposal not found' },
      ]);
    });

    it('still applies the other proposals successfully', async () => {
      const result = await useCase.execute(command);

      expect(result.applied).toBe(2);
    });

    it('calls applyCommandChangeProposal for all proposals', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe('when proposals array is empty', () => {
    const command = buildCommand([]);

    it('returns zero applied', async () => {
      const result = await useCase.execute(command);

      expect(result.applied).toBe(0);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('does not call applyCommandChangeProposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.applyCommandChangeProposal,
      ).not.toHaveBeenCalled();
    });
  });
});
