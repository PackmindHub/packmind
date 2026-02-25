import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  BatchCreateChangeProposalItem,
  CheckChangeProposalsCommand,
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalType,
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { CheckChangeProposalsUseCase } from './CheckChangeProposalsUseCase';

describe('CheckChangeProposalsUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');
  const spaceId = createSpaceId('space-id');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });

  let useCase: CheckChangeProposalsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let changeProposalService: jest.Mocked<ChangeProposalService>;
  let logger: jest.Mocked<PackmindLogger>;

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
  ): CheckChangeProposalsCommand => ({
    userId,
    organizationId,
    spaceId,
    proposals,
  });

  const buildExistingProposal = (
    createdAt: Date,
  ): ChangeProposal<ChangeProposalType> =>
    ({
      createdAt,
    }) as ChangeProposal<ChangeProposalType>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    changeProposalService = {
      findExistingPending: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    logger = stubLogger();
    useCase = new CheckChangeProposalsUseCase(
      accountsPort,
      changeProposalService,
      logger,
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when proposals array is empty', () => {
    const command = buildCommand([]);

    it('returns an empty results array', async () => {
      const result = await useCase.execute(command);

      expect(result.results).toEqual([]);
    });

    it('does not call findExistingPending', async () => {
      await useCase.execute(command);

      expect(changeProposalService.findExistingPending).not.toHaveBeenCalled();
    });
  });

  describe('when all proposals are new', () => {
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({ artefactId: 'artefact-2' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      changeProposalService.findExistingPending.mockResolvedValue(null);
    });

    it('returns exists false for all proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.results).toEqual([
        { index: 0, exists: false, createdAt: null },
        { index: 1, exists: false, createdAt: null },
      ]);
    });

    it('calls findExistingPending for each proposal', async () => {
      await useCase.execute(command);

      expect(changeProposalService.findExistingPending).toHaveBeenCalledTimes(
        2,
      );
    });
  });

  describe('when all proposals already exist', () => {
    const createdAt = new Date('2025-06-15T10:30:00.000Z');
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({ artefactId: 'artefact-2' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      changeProposalService.findExistingPending.mockResolvedValue(
        buildExistingProposal(createdAt),
      );
    });

    it('returns exists true with createdAt for all proposals', async () => {
      const result = await useCase.execute(command);

      expect(result.results).toEqual([
        { index: 0, exists: true, createdAt: '2025-06-15T10:30:00.000Z' },
        { index: 1, exists: true, createdAt: '2025-06-15T10:30:00.000Z' },
      ]);
    });
  });

  describe('when proposals have mixed results', () => {
    const createdAt = new Date('2025-06-15T10:30:00.000Z');
    const proposals = [
      buildProposalItem({ artefactId: 'artefact-1' }),
      buildProposalItem({ artefactId: 'artefact-2' }),
      buildProposalItem({ artefactId: 'artefact-3' }),
    ];
    const command = buildCommand(proposals);

    beforeEach(() => {
      changeProposalService.findExistingPending
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildExistingProposal(createdAt))
        .mockResolvedValueOnce(null);
    });

    it('returns correct exists status for each proposal', async () => {
      const result = await useCase.execute(command);

      expect(result.results).toEqual([
        { index: 0, exists: false, createdAt: null },
        { index: 1, exists: true, createdAt: '2025-06-15T10:30:00.000Z' },
        { index: 2, exists: false, createdAt: null },
      ]);
    });

    it('calls findExistingPending with correct parameters', async () => {
      await useCase.execute(command);

      expect(changeProposalService.findExistingPending).toHaveBeenCalledWith(
        spaceId,
        userId,
        'artefact-2',
        ChangeProposalType.updateCommandName,
        { oldValue: 'Old Name', newValue: 'New Name' },
      );
    });
  });
});
