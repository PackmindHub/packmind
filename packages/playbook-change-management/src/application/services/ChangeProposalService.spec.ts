import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createSpaceId,
  createUserId,
  CreateChangeProposalCommand,
  CreateCommandChangeProposalCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ChangeProposalConflictError } from '../../domain/errors/ChangeProposalConflictError';
import { ChangeProposalNotFoundError } from '../../domain/errors/ChangeProposalNotFoundError';
import { ChangeProposalNotPendingError } from '../../domain/errors/ChangeProposalNotPendingError';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalService } from './ChangeProposalService';
import { DiffService } from './DiffService';

describe('ChangeProposalService', () => {
  let service: ChangeProposalService;
  let repository: jest.Mocked<IChangeProposalRepository>;
  let diffService: DiffService;

  const spaceId = createSpaceId();

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByArtefactId: jest.fn(),
      findBySpaceId: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IChangeProposalRepository>;

    diffService = new DiffService();
    service = new ChangeProposalService(repository, stubLogger(), diffService);
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
      spaceId,
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

    it('sets spaceId from command', async () => {
      const { changeProposal } = await service.createProposal(command);

      expect(changeProposal.spaceId).toBe(spaceId);
    });

    it('saves the proposal to the repository', async () => {
      await service.createProposal(command);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          spaceId,
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
        spaceId,
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
        expect.objectContaining({
          type: ChangeProposalType.updateCommandName,
          artefactId: recipeId,
          artefactVersion,
          spaceId,
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

  describe('listProposalsByArtefactId', () => {
    const recipeId = createRecipeId();
    const currentRecipe = {
      name: 'current name',
      content: 'line 1\nline 2\nline 3',
    };

    const buildPendingNameProposal = (
      overrides?: Partial<ChangeProposal<ChangeProposalType>>,
    ): ChangeProposal<ChangeProposalType> => ({
      id: createChangeProposalId(),
      type: ChangeProposalType.updateCommandName,
      artefactId: recipeId,
      artefactVersion: 1,
      spaceId,
      payload: { oldValue: 'current name', newValue: 'new name' },
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    const buildPendingDescriptionProposal = (
      overrides?: Partial<ChangeProposal<ChangeProposalType>>,
    ): ChangeProposal<ChangeProposalType> => ({
      id: createChangeProposalId(),
      type: ChangeProposalType.updateCommandDescription,
      artefactId: recipeId,
      artefactVersion: 1,
      spaceId,
      payload: {
        oldValue: 'line 1\nline 2\nline 3',
        newValue: 'line 1\nline 2 modified\nline 3',
      },
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('calls repository with the correct artefactId', async () => {
      repository.findByArtefactId.mockResolvedValue([]);

      await service.listProposalsByArtefactId(recipeId);

      expect(repository.findByArtefactId).toHaveBeenCalledWith(recipeId);
    });

    describe('when repository returns empty array', () => {
      it('returns empty changeProposals array', async () => {
        repository.findByArtefactId.mockResolvedValue([]);

        const result = await service.listProposalsByArtefactId(recipeId);

        expect(result.changeProposals).toEqual([]);
      });
    });

    describe('when no currentRecipe is provided', () => {
      it('marks all proposals as not outdated', async () => {
        const proposal = buildPendingNameProposal({
          payload: { oldValue: 'different name', newValue: 'new name' },
        });
        repository.findByArtefactId.mockResolvedValue([proposal]);

        const result = await service.listProposalsByArtefactId(recipeId);

        expect(result.changeProposals[0].outdated).toBe(false);
      });
    });

    describe('when currentRecipe is provided', () => {
      describe('with a pending name proposal', () => {
        describe('when oldValue matches current name', () => {
          it('marks as not outdated', async () => {
            const proposal = buildPendingNameProposal({
              payload: { oldValue: 'current name', newValue: 'new name' },
            });
            repository.findByArtefactId.mockResolvedValue([proposal]);

            const result = await service.listProposalsByArtefactId(
              recipeId,
              currentRecipe,
            );

            expect(result.changeProposals[0].outdated).toBe(false);
          });
        });

        describe('when oldValue differs from current name', () => {
          it('marks as outdated', async () => {
            const proposal = buildPendingNameProposal({
              payload: { oldValue: 'outdated name', newValue: 'new name' },
            });
            repository.findByArtefactId.mockResolvedValue([proposal]);

            const result = await service.listProposalsByArtefactId(
              recipeId,
              currentRecipe,
            );

            expect(result.changeProposals[0].outdated).toBe(true);
          });
        });
      });

      describe('with a pending description proposal', () => {
        describe('when diff applies cleanly', () => {
          it('marks as not outdated', async () => {
            const proposal = buildPendingDescriptionProposal();
            repository.findByArtefactId.mockResolvedValue([proposal]);

            const result = await service.listProposalsByArtefactId(
              recipeId,
              currentRecipe,
            );

            expect(result.changeProposals[0].outdated).toBe(false);
          });
        });

        describe('when diff has conflicts', () => {
          it('marks as outdated', async () => {
            const proposal = buildPendingDescriptionProposal();
            const conflictingRecipe = {
              name: 'current name',
              content: 'line 1\nline 2 changed\nline 3',
            };
            repository.findByArtefactId.mockResolvedValue([proposal]);

            const result = await service.listProposalsByArtefactId(
              recipeId,
              conflictingRecipe,
            );

            expect(result.changeProposals[0].outdated).toBe(true);
          });
        });
      });

      describe('with a non-pending proposal', () => {
        it('marks as not outdated regardless of values', async () => {
          const proposal = buildPendingNameProposal({
            payload: { oldValue: 'outdated name', newValue: 'new name' },
            status: ChangeProposalStatus.applied,
          });
          repository.findByArtefactId.mockResolvedValue([proposal]);

          const result = await service.listProposalsByArtefactId(
            recipeId,
            currentRecipe,
          );

          expect(result.changeProposals[0].outdated).toBe(false);
        });
      });
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
      spaceId,
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
        repository.findByArtefactId.mockResolvedValue([proposal]);
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
        repository.findByArtefactId.mockResolvedValue([]);
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
        repository.findByArtefactId.mockResolvedValue([proposal]);

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
        repository.findByArtefactId.mockResolvedValue([proposal]);

        await expect(
          service.rejectProposal(recipeId, proposal.id, userId),
        ).rejects.toThrow(ChangeProposalNotPendingError);
      });
    });
  });

  describe('applyProposal', () => {
    const recipeId = createRecipeId();
    const userId = createUserId();
    const currentRecipe = {
      name: 'current name',
      content: 'line 1\nline 2\nline 3',
    };

    const buildPendingNameProposal =
      (): ChangeProposal<ChangeProposalType> => ({
        id: createChangeProposalId(),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        artefactVersion: 1,
        spaceId,
        payload: { oldValue: 'old name', newValue: 'new name' },
        captureMode: ChangeProposalCaptureMode.commit,
        status: ChangeProposalStatus.pending,
        createdBy: createUserId(),
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const buildPendingDescriptionProposal =
      (): ChangeProposal<ChangeProposalType> => ({
        id: createChangeProposalId(),
        type: ChangeProposalType.updateCommandDescription,
        artefactId: recipeId,
        artefactVersion: 1,
        spaceId,
        payload: {
          oldValue: 'line 1\nline 2\nline 3',
          newValue: 'line 1\nline 2 modified\nline 3',
        },
        captureMode: ChangeProposalCaptureMode.commit,
        status: ChangeProposalStatus.pending,
        createdBy: createUserId(),
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    describe('when applying a name change proposal', () => {
      let proposal: ChangeProposal<ChangeProposalType>;

      beforeEach(() => {
        proposal = buildPendingNameProposal();
        repository.findByArtefactId.mockResolvedValue([proposal]);
      });

      it('sets status to applied', async () => {
        const { changeProposal } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(changeProposal.status).toBe(ChangeProposalStatus.applied);
      });

      it('sets resolvedBy to the userId', async () => {
        const { changeProposal } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(changeProposal.resolvedBy).toBe(userId);
      });

      it('sets resolvedAt to a date', async () => {
        const { changeProposal } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(changeProposal.resolvedAt).toBeInstanceOf(Date);
      });

      it('returns updated name with newValue', async () => {
        const { updatedFields } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.name).toBe('new name');
      });

      it('keeps content unchanged', async () => {
        const { updatedFields } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.content).toBe(currentRecipe.content);
      });

      it('calls repository.update with the applied proposal', async () => {
        await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(repository.update).toHaveBeenCalledWith(
          expect.objectContaining({
            id: proposal.id,
            status: ChangeProposalStatus.applied,
            resolvedBy: userId,
          }),
        );
      });
    });

    describe('when applying a description change proposal', () => {
      let proposal: ChangeProposal<ChangeProposalType>;

      beforeEach(() => {
        proposal = buildPendingDescriptionProposal();
        repository.findByArtefactId.mockResolvedValue([proposal]);
      });

      it('returns merged content via diff', async () => {
        const { updatedFields } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.content).toBe('line 1\nline 2 modified\nline 3');
      });

      it('keeps name unchanged', async () => {
        const { updatedFields } = await service.applyProposal(
          recipeId,
          proposal.id,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.name).toBe(currentRecipe.name);
      });
    });

    describe('when applying a description proposal with conflict', () => {
      let proposal: ChangeProposal<ChangeProposalType>;
      const conflictingRecipe = {
        name: 'current name',
        content: 'line 1\nline 2 changed\nline 3',
      };

      beforeEach(() => {
        proposal = buildPendingDescriptionProposal();
        repository.findByArtefactId.mockResolvedValue([proposal]);
      });

      describe('when force is false', () => {
        it('throws ChangeProposalConflictError', async () => {
          await expect(
            service.applyProposal(
              recipeId,
              proposal.id,
              userId,
              conflictingRecipe,
              false,
            ),
          ).rejects.toThrow(ChangeProposalConflictError);
        });

        it('does not update the repository', async () => {
          await service
            .applyProposal(
              recipeId,
              proposal.id,
              userId,
              conflictingRecipe,
              false,
            )
            .catch(() => {
              /* expected rejection */
            });

          expect(repository.update).not.toHaveBeenCalled();
        });
      });

      describe('when force is true', () => {
        it('overwrites content with newValue', async () => {
          const { updatedFields } = await service.applyProposal(
            recipeId,
            proposal.id,
            userId,
            conflictingRecipe,
            true,
          );

          expect(updatedFields.content).toBe('line 1\nline 2 modified\nline 3');
        });

        it('sets status to applied', async () => {
          const { changeProposal } = await service.applyProposal(
            recipeId,
            proposal.id,
            userId,
            conflictingRecipe,
            true,
          );

          expect(changeProposal.status).toBe(ChangeProposalStatus.applied);
        });
      });
    });

    describe('when the proposal does not exist', () => {
      it('throws ChangeProposalNotFoundError', async () => {
        repository.findByArtefactId.mockResolvedValue([]);
        const unknownId = createChangeProposalId();

        await expect(
          service.applyProposal(
            recipeId,
            unknownId,
            userId,
            currentRecipe,
            false,
          ),
        ).rejects.toThrow(ChangeProposalNotFoundError);
      });
    });

    describe('when the proposal is already rejected', () => {
      it('throws ChangeProposalNotPendingError', async () => {
        const proposal = {
          ...buildPendingNameProposal(),
          status: ChangeProposalStatus.rejected,
        };
        repository.findByArtefactId.mockResolvedValue([proposal]);

        await expect(
          service.applyProposal(
            recipeId,
            proposal.id,
            userId,
            currentRecipe,
            false,
          ),
        ).rejects.toThrow(ChangeProposalNotPendingError);
      });
    });

    describe('when the proposal is already applied', () => {
      it('throws ChangeProposalNotPendingError', async () => {
        const proposal = {
          ...buildPendingNameProposal(),
          status: ChangeProposalStatus.applied,
        };
        repository.findByArtefactId.mockResolvedValue([proposal]);

        await expect(
          service.applyProposal(
            recipeId,
            proposal.id,
            userId,
            currentRecipe,
            false,
          ),
        ).rejects.toThrow(ChangeProposalNotPendingError);
      });
    });
  });
});
