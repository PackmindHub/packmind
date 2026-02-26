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
import { IChangeProposalValidator } from '../../validators/IChangeProposalValidator';
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
  let validators: jest.Mocked<IChangeProposalValidator>[];
  let logger: jest.Mocked<PackmindLogger>;

  const buildProposalItem = (
    overrides?: Partial<BatchCreateChangeProposalItem>,
  ): BatchCreateChangeProposalItem => ({
    type: ChangeProposalType.updateCommandName,
    artefactId: 'artefact-1',
    payload: { oldValue: 'Old Name', newValue: 'New Name' },
    captureMode: ChangeProposalCaptureMode.commit,
    message: 'test message',
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
    message = 'test message',
  ): ChangeProposal<ChangeProposalType> =>
    ({
      createdAt,
      message,
    }) as ChangeProposal<ChangeProposalType>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    changeProposalService = {
      findExistingPending: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    validators = [];

    logger = stubLogger();
    useCase = new CheckChangeProposalsUseCase(
      accountsPort,
      changeProposalService,
      validators,
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
        { index: 0, exists: false, createdAt: null, message: null },
        { index: 1, exists: false, createdAt: null, message: null },
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
        {
          index: 0,
          exists: true,
          createdAt: '2025-06-15T10:30:00.000Z',
          message: 'test message',
        },
        {
          index: 1,
          exists: true,
          createdAt: '2025-06-15T10:30:00.000Z',
          message: 'test message',
        },
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
        { index: 0, exists: false, createdAt: null, message: null },
        {
          index: 1,
          exists: true,
          createdAt: '2025-06-15T10:30:00.000Z',
          message: 'test message',
        },
        { index: 2, exists: false, createdAt: null, message: null },
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

  describe('when a validator resolves the payload', () => {
    const resolvedPayload = {
      targetId: 'resolved-rule-id',
      item: { id: 'resolved-rule-id', content: 'rule content' },
    };
    const createdAt = new Date('2025-06-15T10:30:00.000Z');

    const deleteRuleCommand = buildCommand([
      buildProposalItem({
        type: ChangeProposalType.deleteRule,
        artefactId: 'standard-1',
        payload: {
          targetId: 'unresolved-xxx',
          item: { content: 'rule content' },
        },
      }),
    ]);

    beforeEach(() => {
      const validator: jest.Mocked<IChangeProposalValidator> = {
        supports: jest.fn((type) => type === ChangeProposalType.deleteRule),
        validate: jest.fn().mockResolvedValue({
          artefactVersion: 1,
          resolvedPayload,
        }),
      };
      validators.push(validator);
      changeProposalService.findExistingPending.mockResolvedValue(
        buildExistingProposal(createdAt),
      );
    });

    it('calls findExistingPending with the resolved payload', async () => {
      await useCase.execute(deleteRuleCommand);

      expect(changeProposalService.findExistingPending).toHaveBeenCalledWith(
        spaceId,
        userId,
        'standard-1',
        ChangeProposalType.deleteRule,
        resolvedPayload,
      );
    });

    it('returns exists true', async () => {
      const result = await useCase.execute(deleteRuleCommand);

      expect(result.results[0].exists).toBe(true);
    });
  });

  describe('when validation throws an error', () => {
    const deleteRuleCommand = buildCommand([
      buildProposalItem({
        type: ChangeProposalType.deleteRule,
        artefactId: 'standard-1',
        payload: {
          targetId: 'unresolved-xxx',
          item: { content: 'deleted rule' },
        },
      }),
    ]);

    beforeEach(() => {
      const validator: jest.Mocked<IChangeProposalValidator> = {
        supports: jest.fn((type) => type === ChangeProposalType.deleteRule),
        validate: jest.fn().mockRejectedValue(new Error('rule not found')),
      };
      validators.push(validator);
    });

    it('returns exists false', async () => {
      const result = await useCase.execute(deleteRuleCommand);

      expect(result.results[0].exists).toBe(false);
    });

    it('does not call findExistingPending', async () => {
      await useCase.execute(deleteRuleCommand);

      expect(changeProposalService.findExistingPending).not.toHaveBeenCalled();
    });
  });

  describe('when no validator matches the proposal type', () => {
    const addRuleCommand = buildCommand([
      buildProposalItem({
        type: ChangeProposalType.addRule,
        payload: { item: { content: 'new rule' } },
      }),
    ]);

    beforeEach(() => {
      changeProposalService.findExistingPending.mockResolvedValue(null);
    });

    it('calls findExistingPending with the original payload', async () => {
      await useCase.execute(addRuleCommand);

      expect(changeProposalService.findExistingPending).toHaveBeenCalledWith(
        spaceId,
        userId,
        'artefact-1',
        ChangeProposalType.addRule,
        { item: { content: 'new rule' } },
      );
    });

    it('returns exists false', async () => {
      const result = await useCase.execute(addRuleCommand);

      expect(result.results[0].exists).toBe(false);
    });
  });
});
