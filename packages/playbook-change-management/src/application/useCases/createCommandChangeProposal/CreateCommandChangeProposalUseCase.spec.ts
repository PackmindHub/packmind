import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  CreateCommandChangeProposalCommand,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { SpaceNotFoundError } from '../../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../../domain/errors/SpaceOwnershipMismatchError';
import { CreateCommandChangeProposalUseCase } from './CreateCommandChangeProposalUseCase';

describe('CreateCommandChangeProposalUseCase', () => {
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

  let useCase: CreateCommandChangeProposalUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;

  const buildCommand = (
    overrides?: Partial<CreateCommandChangeProposalCommand>,
  ): CreateCommandChangeProposalCommand => ({
    userId: userId,
    organizationId: organizationId,
    spaceId: spaceId,
    type: ChangeProposalType.updateCommandName,
    artefactId: recipeId,
    artefactVersion: 5,
    payload: { oldValue: 'Old Name', newValue: 'New Name' },
    captureMode: ChangeProposalCaptureMode.commit,
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
      createProposal: jest.fn(),
      findExistingPending: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ChangeProposalService>;

    useCase = new CreateCommandChangeProposalUseCase(
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

  describe('when creating a command change proposal', () => {
    const command = buildCommand();

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.createProposal.mockResolvedValue({
        changeProposal: {} as ChangeProposal<ChangeProposalType>,
      });
    });

    it('validates space ownership', async () => {
      await useCase.execute(command);

      expect(spacesPort.getSpaceById).toHaveBeenCalledWith(spaceId);
    });

    it('checks for existing pending duplicates', async () => {
      await useCase.execute(command);

      expect(service.findExistingPending).toHaveBeenCalledWith(
        spaceId,
        userId,
        recipeId,
        ChangeProposalType.updateCommandName,
        { oldValue: 'Old Name', newValue: 'New Name' },
      );
    });

    it('delegates to service.createProposal', async () => {
      await useCase.execute(command);

      expect(service.createProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId,
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          artefactVersion: 5,
        }),
      );
    });

    it('returns wasCreated true', async () => {
      const result = await useCase.execute(command);

      expect(result.wasCreated).toBe(true);
    });
  });

  describe('when a pending duplicate exists', () => {
    const command = buildCommand();

    const existingProposal: ChangeProposal<ChangeProposalType> = {
      id: createChangeProposalId(),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      artefactVersion: 5,
      spaceId,
      payload: { oldValue: 'Old Name', newValue: 'New Name' },
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId('user-id'),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
      service.findExistingPending.mockResolvedValue(existingProposal);
    });

    it('returns the existing proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.changeProposal).toBe(existingProposal);
    });

    it('returns wasCreated false', async () => {
      const result = await useCase.execute(command);

      expect(result.wasCreated).toBe(false);
    });

    it('does not call createProposal', async () => {
      await useCase.execute(command);

      expect(service.createProposal).not.toHaveBeenCalled();
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

    it('does not check for duplicates', async () => {
      await useCase.execute(command).catch(() => {
        /* expected rejection */
      });

      expect(service.findExistingPending).not.toHaveBeenCalled();
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

      expect(service.createProposal).not.toHaveBeenCalled();
    });
  });
});
