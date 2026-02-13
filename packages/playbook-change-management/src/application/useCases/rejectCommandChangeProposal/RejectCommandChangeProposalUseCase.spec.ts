import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  RejectCommandChangeProposalCommand,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { changeProposalFactory } from '../../../../test/changeProposalFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ChangeProposalNotFoundError } from '../../../domain/errors/ChangeProposalNotFoundError';
import { ChangeProposalNotPendingError } from '../../../domain/errors/ChangeProposalNotPendingError';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { RejectCommandChangeProposalUseCase } from './RejectCommandChangeProposalUseCase';

describe('RejectCommandChangeProposalUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');
  const recipeId = createRecipeId('recipe-id');
  const changeProposalId = createChangeProposalId('proposal-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });

  let useCase: RejectCommandChangeProposalUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<RejectCommandChangeProposalCommand>,
  ): RejectCommandChangeProposalCommand => ({
    userId: userId,
    organizationId: organizationId,
    spaceId: spaceId,
    recipeId: recipeId,
    changeProposalId: changeProposalId,
    ...overrides,
  });

  const buildPendingProposal = (
    overrides?: Partial<ChangeProposal<ChangeProposalType>>,
  ) =>
    changeProposalFactory({
      id: changeProposalId,
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      spaceId,
      payload: { oldValue: 'old', newValue: 'new' },
      ...overrides,
    });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    service = {
      findById: jest.fn(),
      rejectProposal: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new RejectCommandChangeProposalUseCase(
      accountsPort,
      spacesPort,
      service,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when rejecting a proposal successfully', () => {
    const command = buildCommand();
    const proposal = buildPendingProposal();
    const rejectedProposal = {
      ...proposal,
      status: ChangeProposalStatus.rejected,
      resolvedBy: userId,
      resolvedAt: new Date(),
    };

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.findById.mockResolvedValue(proposal);
      service.rejectProposal.mockResolvedValue(rejectedProposal);
    });

    it('delegates to service with proposal and userId', async () => {
      await useCase.execute(command);

      expect(service.rejectProposal).toHaveBeenCalledWith(proposal, userId);
    });

    it('returns the rejected change proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposal).toBe(rejectedProposal);
    });
  });

  describe('when proposal is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.findById.mockResolvedValue(null);
    });

    it('throws ChangeProposalNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        ChangeProposalNotFoundError,
      );
    });

    it('does not call rejectProposal', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.rejectProposal).not.toHaveBeenCalled();
    });
  });

  describe('when proposal is already rejected', () => {
    const command = buildCommand();
    const proposal = buildPendingProposal({
      status: ChangeProposalStatus.rejected,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.findById.mockResolvedValue(proposal);
    });

    it('throws ChangeProposalNotPendingError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        ChangeProposalNotPendingError,
      );
    });

    it('does not call rejectProposal', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.rejectProposal).not.toHaveBeenCalled();
    });
  });

  describe('when proposal is already applied', () => {
    const command = buildCommand();
    const proposal = buildPendingProposal({
      status: ChangeProposalStatus.applied,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.findById.mockResolvedValue(proposal);
    });

    it('throws ChangeProposalNotPendingError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        ChangeProposalNotPendingError,
      );
    });

    it('does not call rejectProposal', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.rejectProposal).not.toHaveBeenCalled();
    });
  });

  describe('when space is not found', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.findById).not.toHaveBeenCalled();
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

    it('throws SpaceOwnershipMismatchError', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        SpaceOwnershipMismatchError,
      );
    });

    it('does not call the service', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.findById).not.toHaveBeenCalled();
    });
  });
});
