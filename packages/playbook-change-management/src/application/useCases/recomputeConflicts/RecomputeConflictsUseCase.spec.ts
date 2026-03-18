import { stubLogger } from '@packmind/test-utils';
import {
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  RecomputeConflictsCommand,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { changeProposalFactory } from '../../../../test/changeProposalFactory';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ConflictDetectionService } from '../../services/ConflictDetectionService';
import { RecomputeConflictsUseCase } from './RecomputeConflictsUseCase';

describe('RecomputeConflictsUseCase', () => {
  const userId = createUserId('user-id');
  const organizationId = createOrganizationId('organization-id');
  const spaceId = createSpaceId('space-id');
  const standardId = createStandardId('standard-1');

  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const organization = organizationFactory({ id: organizationId });
  const space = spaceFactory({ id: spaceId, organizationId });

  let useCase: RecomputeConflictsUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let service: jest.Mocked<ChangeProposalService>;
  let conflictDetectionService: jest.Mocked<ConflictDetectionService>;

  const buildCommand = (
    overrides?: Partial<RecomputeConflictsCommand>,
  ): RecomputeConflictsCommand => ({
    userId,
    organizationId,
    spaceId,
    artefactId: standardId,
    decisions: {},
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
      findProposalsByArtefact: jest.fn(),
    } as unknown as jest.Mocked<ChangeProposalService>;

    conflictDetectionService = {
      detectConflicts: jest.fn(),
    } as unknown as jest.Mocked<ConflictDetectionService>;

    useCase = new RecomputeConflictsUseCase(
      accountsPort,
      spacesPort,
      service,
      conflictDetectionService,
      stubLogger(),
    );

    accountsPort.getUserById.mockResolvedValue(user);
    accountsPort.getOrganizationById.mockResolvedValue(organization);
    spacesPort.getSpaceById.mockResolvedValue(space);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when proposals have no decisions', () => {
    const proposalId1 = createChangeProposalId('proposal-1');
    const proposalId2 = createChangeProposalId('proposal-2');

    const proposals = [
      changeProposalFactory({
        id: proposalId1,
        type: ChangeProposalType.updateStandardName,
        artefactId: standardId,
        spaceId,
      }),
      changeProposalFactory({
        id: proposalId2,
        type: ChangeProposalType.updateStandardName,
        artefactId: standardId,
        spaceId,
      }),
    ];

    beforeEach(() => {
      service.findProposalsByArtefact.mockResolvedValue(proposals);
      conflictDetectionService.detectConflicts.mockReturnValue(
        proposals.map((p) => ({
          ...p,
          conflictsWith: [proposals.find((other) => other.id !== p.id)!.id],
        })),
      );
    });

    it('returns conflicts from detection service', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.conflicts[proposalId1]).toEqual([proposalId2]);
    });

    it('returns bidirectional conflicts', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.conflicts[proposalId2]).toEqual([proposalId1]);
    });

    it('passes unmodified proposals to detection service', async () => {
      await useCase.execute(buildCommand());

      expect(conflictDetectionService.detectConflicts).toHaveBeenCalledWith(
        proposals,
      );
    });
  });

  describe('when a proposal has a decision', () => {
    const proposalId1 = createChangeProposalId('proposal-1');
    const proposalId2 = createChangeProposalId('proposal-2');

    const proposals = [
      changeProposalFactory({
        id: proposalId1,
        type: ChangeProposalType.updateStandardName,
        artefactId: standardId,
        spaceId,
        payload: { oldValue: 'Original', newValue: 'Change A' },
      }),
      changeProposalFactory({
        id: proposalId2,
        type: ChangeProposalType.updateStandardName,
        artefactId: standardId,
        spaceId,
        payload: { oldValue: 'Original', newValue: 'Change B' },
      }),
    ];

    const decision = { oldValue: 'Original', newValue: 'Edited A' };

    beforeEach(() => {
      service.findProposalsByArtefact.mockResolvedValue(proposals);
      conflictDetectionService.detectConflicts.mockReturnValue(
        proposals.map((p) => ({ ...p, conflictsWith: [] })),
      );
    });

    it('injects decision into the matching proposal', async () => {
      await useCase.execute(
        buildCommand({ decisions: { [proposalId1]: decision } }),
      );

      const passedProposals =
        conflictDetectionService.detectConflicts.mock.calls[0][0];

      expect(passedProposals[0].decision).toEqual(decision);
    });

    it('leaves other proposals unchanged', async () => {
      await useCase.execute(
        buildCommand({ decisions: { [proposalId1]: decision } }),
      );

      const passedProposals =
        conflictDetectionService.detectConflicts.mock.calls[0][0];

      expect(passedProposals[1]).toBe(proposals[1]);
    });
  });

  describe('when proposals include non-pending statuses', () => {
    const pendingProposalId = createChangeProposalId('pending-proposal');

    const pendingProposal = changeProposalFactory({
      id: pendingProposalId,
      type: ChangeProposalType.updateStandardName,
      artefactId: standardId,
      spaceId,
      status: ChangeProposalStatus.pending,
    });

    const appliedProposal = changeProposalFactory({
      artefactId: standardId,
      spaceId,
      status: ChangeProposalStatus.applied,
      decision: { oldValue: 'Old', newValue: 'Applied' },
    });

    beforeEach(() => {
      service.findProposalsByArtefact.mockResolvedValue([
        pendingProposal,
        appliedProposal,
      ]);
      conflictDetectionService.detectConflicts.mockReturnValue([
        { ...pendingProposal, conflictsWith: [] },
      ]);
    });

    it('filters out non-pending proposals', async () => {
      await useCase.execute(buildCommand());

      expect(conflictDetectionService.detectConflicts).toHaveBeenCalledWith([
        pendingProposal,
      ]);
    });
  });

  describe('when no proposals exist', () => {
    beforeEach(() => {
      service.findProposalsByArtefact.mockResolvedValue([]);
      conflictDetectionService.detectConflicts.mockReturnValue([]);
    });

    it('returns empty conflicts', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.conflicts).toEqual({});
    });
  });
});
