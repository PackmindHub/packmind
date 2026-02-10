import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createUserId,
  CreateChangeProposalCommand,
  CreateCommandChangeProposalCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ChangeProposalNotFoundError } from '../../domain/errors/ChangeProposalNotFoundError';
import { ChangeProposalNotPendingError } from '../../domain/errors/ChangeProposalNotPendingError';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalService } from './ChangeProposalService';

describe('ChangeProposalService', () => {
  let service: ChangeProposalService;
  let repository: jest.Mocked<IChangeProposalRepository>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByRecipeId: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IChangeProposalRepository>;

    service = new ChangeProposalService(repository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createProposal', () => {
    const recipeId = createRecipeId();
    const userId = createUserId();

    const command: CreateCommandChangeProposalCommand = {
      userId: userId as unknown as string,
      organizationId: 'org-1',
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      artefactVersion: 1,
      payload: { oldValue: 'old name', newValue: 'new name' },
      captureMode: ChangeProposalCaptureMode.commit,
    };

    it('creates a proposal with pending status', async () => {
      const { changeProposal } = await service.createProposal(command);

      expect(changeProposal.status).toBe(ChangeProposalStatus.pending);
    });

    it('generates an id', async () => {
      const { changeProposal } = await service.createProposal(command);

      expect(changeProposal.id).toBeDefined();
    });

    it('sets createdBy from userId', async () => {
      const { changeProposal } = await service.createProposal(command);

      expect(changeProposal.createdBy).toBe(userId);
    });

    it('saves the proposal to the repository', async () => {
      await service.createProposal(command);

      expect(repository.save).toHaveBeenCalledWith(
        recipeId,
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          status: ChangeProposalStatus.pending,
        }),
      );
    });

    it('returns the created change proposal', async () => {
      const result = await service.createProposal(command);

      expect(result.changeProposal).toEqual(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          artefactVersion: 1,
          payload: { oldValue: 'old name', newValue: 'new name' },
          captureMode: ChangeProposalCaptureMode.commit,
        }),
      );
    });

    it('sets resolvedBy to null', async () => {
      const { changeProposal } = await service.createProposal(command);

      expect(changeProposal.resolvedBy).toBeNull();
    });

    it('sets resolvedAt to null', async () => {
      const { changeProposal } = await service.createProposal(command);

      expect(changeProposal.resolvedAt).toBeNull();
    });
  });

  describe('createChangeProposal', () => {
    const recipeId = createRecipeId();
    const userId = createUserId();
    const artefactVersion = 3;

    const command: CreateChangeProposalCommand<ChangeProposalType.updateCommandName> =
      {
        userId: userId as unknown as string,
        organizationId: 'org-1',
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        payload: { oldValue: 'old name', newValue: 'new name' },
        captureMode: ChangeProposalCaptureMode.commit,
      };

    it('creates a proposal with pending status', async () => {
      const { changeProposal } = await service.createChangeProposal(
        command,
        artefactVersion,
      );

      expect(changeProposal.status).toBe(ChangeProposalStatus.pending);
    });

    it('uses the provided artefactVersion', async () => {
      const { changeProposal } = await service.createChangeProposal(
        command,
        artefactVersion,
      );

      expect(changeProposal.artefactVersion).toBe(artefactVersion);
    });

    it('generates an id', async () => {
      const { changeProposal } = await service.createChangeProposal(
        command,
        artefactVersion,
      );

      expect(changeProposal.id).toBeDefined();
    });

    it('sets createdBy from userId', async () => {
      const { changeProposal } = await service.createChangeProposal(
        command,
        artefactVersion,
      );

      expect(changeProposal.createdBy).toBe(userId);
    });

    it('saves the proposal to the repository', async () => {
      await service.createChangeProposal(command, artefactVersion);

      expect(repository.save).toHaveBeenCalledWith(
        recipeId,
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          artefactVersion,
          status: ChangeProposalStatus.pending,
        }),
      );
    });

    it('sets resolvedBy to null', async () => {
      const { changeProposal } = await service.createChangeProposal(
        command,
        artefactVersion,
      );

      expect(changeProposal.resolvedBy).toBeNull();
    });

    it('sets resolvedAt to null', async () => {
      const { changeProposal } = await service.createChangeProposal(
        command,
        artefactVersion,
      );

      expect(changeProposal.resolvedAt).toBeNull();
    });
  });

  describe('listProposalsByRecipeId', () => {
    const recipeId = createRecipeId();

    describe('when repository returns proposals', () => {
      it('delegates to repository and returns result', async () => {
        const proposals = [
          {
            id: createChangeProposalId(),
            type: ChangeProposalType.updateCommandName,
            artefactId: recipeId,
            artefactVersion: 1,
            payload: { oldValue: 'old', newValue: 'new' },
            captureMode: ChangeProposalCaptureMode.commit,
            status: ChangeProposalStatus.pending,
            createdBy: createUserId(),
            resolvedBy: null,
            resolvedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        repository.findByRecipeId.mockResolvedValue(proposals);

        const result = await service.listProposalsByRecipeId(recipeId);

        expect(result.changeProposals).toEqual(proposals);
      });
    });

    describe('when repository returns empty array', () => {
      it('returns empty changeProposals array', async () => {
        repository.findByRecipeId.mockResolvedValue([]);

        const result = await service.listProposalsByRecipeId(recipeId);

        expect(result.changeProposals).toEqual([]);
      });
    });

    it('calls repository with the correct recipeId', async () => {
      repository.findByRecipeId.mockResolvedValue([]);

      await service.listProposalsByRecipeId(recipeId);

      expect(repository.findByRecipeId).toHaveBeenCalledWith(recipeId);
    });
  });

  describe('rejectProposal', () => {
    const recipeId = createRecipeId();
    const userId = createUserId();

    const buildPendingProposal = (): ChangeProposal<ChangeProposalType> => ({
      id: createChangeProposalId(),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      artefactVersion: 1,
      payload: { oldValue: 'old', newValue: 'new' },
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    describe('when the proposal exists and is pending', () => {
      let proposal: ChangeProposal<ChangeProposalType>;

      beforeEach(() => {
        proposal = buildPendingProposal();
        repository.findByRecipeId.mockResolvedValue([proposal]);
      });

      it('sets status to rejected', async () => {
        const { changeProposal } = await service.rejectProposal(
          recipeId,
          proposal.id,
          userId,
        );

        expect(changeProposal.status).toBe(ChangeProposalStatus.rejected);
      });

      it('sets resolvedBy to the userId', async () => {
        const { changeProposal } = await service.rejectProposal(
          recipeId,
          proposal.id,
          userId,
        );

        expect(changeProposal.resolvedBy).toBe(userId);
      });

      it('sets resolvedAt to a date', async () => {
        const { changeProposal } = await service.rejectProposal(
          recipeId,
          proposal.id,
          userId,
        );

        expect(changeProposal.resolvedAt).toBeInstanceOf(Date);
      });

      it('calls repository.update with the rejected proposal', async () => {
        await service.rejectProposal(recipeId, proposal.id, userId);

        expect(repository.update).toHaveBeenCalledWith(
          recipeId,
          expect.objectContaining({
            id: proposal.id,
            status: ChangeProposalStatus.rejected,
            resolvedBy: userId,
          }),
        );
      });
    });

    describe('when the proposal does not exist', () => {
      it('throws ChangeProposalNotFoundError', async () => {
        repository.findByRecipeId.mockResolvedValue([]);
        const unknownId = createChangeProposalId();

        await expect(
          service.rejectProposal(recipeId, unknownId, userId),
        ).rejects.toThrow(ChangeProposalNotFoundError);
      });
    });

    describe('when the proposal is already rejected', () => {
      it('throws ChangeProposalNotPendingError', async () => {
        const proposal = {
          ...buildPendingProposal(),
          status: ChangeProposalStatus.rejected,
        };
        repository.findByRecipeId.mockResolvedValue([proposal]);

        await expect(
          service.rejectProposal(recipeId, proposal.id, userId),
        ).rejects.toThrow(ChangeProposalNotPendingError);
      });
    });

    describe('when the proposal is already applied', () => {
      it('throws ChangeProposalNotPendingError', async () => {
        const proposal = {
          ...buildPendingProposal(),
          status: ChangeProposalStatus.applied,
        };
        repository.findByRecipeId.mockResolvedValue([proposal]);

        await expect(
          service.rejectProposal(recipeId, proposal.id, userId),
        ).rejects.toThrow(ChangeProposalNotPendingError);
      });
    });
  });
});
