import { stubLogger } from '@packmind/test-utils';
import {
  BatchCreateChangeProposalItem,
  BatchCreateChangeProposalsCommand,
  ChangeProposalCaptureMode,
  ChangeProposalType,
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  IPlaybookChangeManagementPort,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { ChangeProposalPayloadMismatchError } from '../../errors/ChangeProposalPayloadMismatchError';
import { UnsupportedChangeProposalTypeError } from '../../errors/UnsupportedChangeProposalTypeError';
import { BatchCreateChangeProposalsUseCase } from './BatchCreateChangeProposalsUseCase';

describe('BatchCreateChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });

  let useCase: BatchCreateChangeProposalsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let playbookChangeManagementPort: jest.Mocked<IPlaybookChangeManagementPort>;

  const buildProposalItem = (
    overrides?: Partial<BatchCreateChangeProposalItem>,
  ): BatchCreateChangeProposalItem => ({
    type: ChangeProposalType.updateCommandName,
    artefactId: 'artefact-1',
    payload: { oldValue: 'Old Name', newValue: 'New Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    ...overrides,
  });

  const buildCommand = (
    proposals: BatchCreateChangeProposalItem[] = [],
  ): BatchCreateChangeProposalsCommand => ({
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
      createChangeProposal: jest.fn(),
    } as unknown as jest.Mocked<IPlaybookChangeManagementPort>;

    useCase = new BatchCreateChangeProposalsUseCase(
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

  describe('when all proposals are created successfully', () => {
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({ artefactId: 'artefact-2' }),
      buildProposalItem({ artefactId: 'artefact-3' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      playbookChangeManagementPort.createChangeProposal.mockResolvedValue({
        changeProposal: {} as never,
        wasCreated: true,
      });
    });

    it('returns created count matching the number of proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.created).toBe(3);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('calls createChangeProposal for each proposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.createChangeProposal,
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe('when one proposal fails with UnsupportedChangeProposalTypeError', () => {
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({
        artefactId: 'artefact-2',
        type: ChangeProposalType.updateStandardName,
      }),
      buildProposalItem({ artefactId: 'artefact-3' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      playbookChangeManagementPort.createChangeProposal
        .mockResolvedValueOnce({
          changeProposal: {} as never,
          wasCreated: true,
        })
        .mockRejectedValueOnce(
          new UnsupportedChangeProposalTypeError(
            ChangeProposalType.updateStandardName,
          ),
        )
        .mockResolvedValueOnce({
          changeProposal: {} as never,
          wasCreated: true,
        });
    });

    it('adds the error with the correct item index', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([
        {
          index: 1,
          message: `Unsupported change proposal type: ${ChangeProposalType.updateStandardName}`,
        },
      ]);
    });

    it('still creates the other proposals successfully', async () => {
      const result = await useCase.execute(command);

      expect(result.created).toBe(2);
    });
  });

  describe('when one proposal fails with ChangeProposalPayloadMismatchError', () => {
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({ artefactId: 'artefact-2' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      playbookChangeManagementPort.createChangeProposal
        .mockRejectedValueOnce(
          new ChangeProposalPayloadMismatchError(
            ChangeProposalType.updateCommandName,
            'Wrong Name',
            'Actual Name',
          ),
        )
        .mockResolvedValueOnce({
          changeProposal: {} as never,
          wasCreated: true,
        });
    });

    it('adds the error with the correct item index', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([
        {
          index: 0,
          message: `Payload oldValue does not match current value for ${ChangeProposalType.updateCommandName}: expected "Actual Name", got "Wrong Name"`,
        },
      ]);
    });

    it('still creates the remaining proposals successfully', async () => {
      const result = await useCase.execute(command);

      expect(result.created).toBe(1);
    });
  });

  describe('when a duplicate exists', () => {
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({ artefactId: 'artefact-2' }),
      buildProposalItem({ artefactId: 'artefact-3' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      playbookChangeManagementPort.createChangeProposal
        .mockResolvedValueOnce({
          changeProposal: {} as never,
          wasCreated: true,
        })
        .mockResolvedValueOnce({
          changeProposal: {} as never,
          wasCreated: false,
        })
        .mockResolvedValueOnce({
          changeProposal: {} as never,
          wasCreated: true,
        });
    });

    it('counts only newly created proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.created).toBe(2);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('calls createChangeProposal for all proposals', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.createChangeProposal,
      ).toHaveBeenCalledTimes(3);
    });
  });

  describe('when proposals array is empty', () => {
    const command = buildCommand([]);

    it('returns zero created', async () => {
      const result = await useCase.execute(command);

      expect(result.created).toBe(0);
    });

    it('returns an empty errors array', async () => {
      const result = await useCase.execute(command);

      expect(result.errors).toEqual([]);
    });

    it('does not call createChangeProposal', async () => {
      await useCase.execute(command);

      expect(
        playbookChangeManagementPort.createChangeProposal,
      ).not.toHaveBeenCalled();
    });
  });
});
