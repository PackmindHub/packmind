import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  CreateChangeProposalCommand,
  CreateCommandChangeProposalCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ChangeProposalConflictError } from '../../domain/errors/ChangeProposalConflictError';
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
      findById: jest.fn(),
      findByArtefactId: jest.fn(),
      findBySpaceId: jest.fn(),
      findExistingPending: jest.fn(),
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

  describe('findExistingPending', () => {
    const recipeId = createRecipeId();
    const userId = createUserId();

    describe('when a pending duplicate exists', () => {
      const existingProposal: ChangeProposal<ChangeProposalType> = {
        id: createChangeProposalId(),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        artefactVersion: 1,
        spaceId,
        payload: { oldValue: 'old name', newValue: 'new name' },
        captureMode: ChangeProposalCaptureMode.commit,
        status: ChangeProposalStatus.pending,
        createdBy: userId,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      beforeEach(() => {
        repository.findExistingPending.mockResolvedValue(existingProposal);
      });

      it('returns the existing proposal', async () => {
        const result = await service.findExistingPending(
          spaceId,
          userId,
          recipeId,
          ChangeProposalType.updateCommandName,
          { oldValue: 'old name', newValue: 'new name' },
        );

        expect(result).toBe(existingProposal);
      });
    });

    describe('when no duplicate exists', () => {
      beforeEach(() => {
        repository.findExistingPending.mockResolvedValue(null);
      });

      it('returns null', async () => {
        const result = await service.findExistingPending(
          spaceId,
          userId,
          recipeId,
          ChangeProposalType.updateCommandName,
          { oldValue: 'old name', newValue: 'new name' },
        );

        expect(result).toBeNull();
      });
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

    it('calls repository with the correct spaceId and artefactId', async () => {
      repository.findByArtefactId.mockResolvedValue([]);

      await service.listProposalsByArtefactId(spaceId, recipeId);

      expect(repository.findByArtefactId).toHaveBeenCalledWith(
        spaceId,
        recipeId,
      );
    });

    describe('when repository returns empty array', () => {
      it('returns empty changeProposals array', async () => {
        repository.findByArtefactId.mockResolvedValue([]);

        const result = await service.listProposalsByArtefactId(
          spaceId,
          recipeId,
        );

        expect(result.changeProposals).toEqual([]);
      });
    });

    describe('when no currentRecipe is provided', () => {
      it('marks all proposals as not outdated', async () => {
        const proposal = buildPendingNameProposal({
          payload: { oldValue: 'different name', newValue: 'new name' },
        });
        repository.findByArtefactId.mockResolvedValue([proposal]);

        const result = await service.listProposalsByArtefactId(
          spaceId,
          recipeId,
        );

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
              spaceId,
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
              spaceId,
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
              spaceId,
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
              spaceId,
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
            spaceId,
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

    let proposal: ChangeProposal<ChangeProposalType>;

    beforeEach(() => {
      proposal = buildPendingProposal();
    });

    it('sets status to rejected', async () => {
      const result = await service.rejectProposal(proposal, userId);

      expect(result.status).toBe(ChangeProposalStatus.rejected);
    });

    it('sets resolvedBy to the userId', async () => {
      const result = await service.rejectProposal(proposal, userId);

      expect(result.resolvedBy).toBe(userId);
    });

    it('sets resolvedAt to a date', async () => {
      const result = await service.rejectProposal(proposal, userId);

      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('calls repository.update with the rejected proposal', async () => {
      await service.rejectProposal(proposal, userId);

      expect(repository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: proposal.id,
          status: ChangeProposalStatus.rejected,
          resolvedBy: userId,
        }),
      );
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
      });

      it('sets status to applied', async () => {
        const { appliedProposal } = await service.applyProposal(
          proposal,
          userId,
          currentRecipe,
          false,
        );

        expect(appliedProposal.status).toBe(ChangeProposalStatus.applied);
      });

      it('sets resolvedBy to the userId', async () => {
        const { appliedProposal } = await service.applyProposal(
          proposal,
          userId,
          currentRecipe,
          false,
        );

        expect(appliedProposal.resolvedBy).toBe(userId);
      });

      it('sets resolvedAt to a date', async () => {
        const { appliedProposal } = await service.applyProposal(
          proposal,
          userId,
          currentRecipe,
          false,
        );

        expect(appliedProposal.resolvedAt).toBeInstanceOf(Date);
      });

      it('returns updated name with newValue', async () => {
        const { updatedFields } = await service.applyProposal(
          proposal,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.name).toBe('new name');
      });

      it('keeps content unchanged', async () => {
        const { updatedFields } = await service.applyProposal(
          proposal,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.content).toBe(currentRecipe.content);
      });

      it('calls repository.update with the applied proposal', async () => {
        await service.applyProposal(proposal, userId, currentRecipe, false);

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
      });

      it('returns merged content via diff', async () => {
        const { updatedFields } = await service.applyProposal(
          proposal,
          userId,
          currentRecipe,
          false,
        );

        expect(updatedFields.content).toBe('line 1\nline 2 modified\nline 3');
      });

      it('keeps name unchanged', async () => {
        const { updatedFields } = await service.applyProposal(
          proposal,
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
      });

      describe('when force is false', () => {
        it('throws ChangeProposalConflictError', async () => {
          await expect(
            service.applyProposal(proposal, userId, conflictingRecipe, false),
          ).rejects.toThrow(ChangeProposalConflictError);
        });

        it('does not update the repository', async () => {
          await service
            .applyProposal(proposal, userId, conflictingRecipe, false)
            .catch(() => {
              /* expected rejection */
            });

          expect(repository.update).not.toHaveBeenCalled();
        });
      });

      describe('when force is true', () => {
        it('overwrites content with newValue', async () => {
          const { updatedFields } = await service.applyProposal(
            proposal,
            userId,
            conflictingRecipe,
            true,
          );

          expect(updatedFields.content).toBe('line 1\nline 2 modified\nline 3');
        });

        it('sets status to applied', async () => {
          const { appliedProposal } = await service.applyProposal(
            proposal,
            userId,
            conflictingRecipe,
            true,
          );

          expect(appliedProposal.status).toBe(ChangeProposalStatus.applied);
        });
      });
    });
  });

  describe('groupProposalsByArtefact', () => {
    const standardId1 = createStandardId('standard-1');
    const standardId2 = createStandardId('standard-2');
    const recipeId1 = createRecipeId('recipe-1');
    const recipeId2 = createRecipeId('recipe-2');
    const skillId1 = createSkillId('skill-1');
    const skillId2 = createSkillId('skill-2');

    const createProposal = <T extends ChangeProposalType>(
      type: T,
      artefactId: string,
    ): ChangeProposal<T> => ({
      id: createChangeProposalId(),
      type,
      artefactId: artefactId as ChangeProposal<T>['artefactId'],
      artefactVersion: 1,
      spaceId,
      payload: {
        oldValue: 'old',
        newValue: 'new',
      } as ChangeProposal<T>['payload'],
      captureMode: ChangeProposalCaptureMode.commit,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    describe('when space has no proposals', () => {
      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue([]);
      });

      it('returns empty standards map', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.size).toBe(0);
      });

      it('returns empty commands map', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.size).toBe(0);
      });

      it('returns empty skills map', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(0);
      });

      it('calls repository with correct spaceId', async () => {
        await service.groupProposalsByArtefact(spaceId);

        expect(repository.findBySpaceId).toHaveBeenCalledWith(spaceId);
      });
    });

    describe('when space has proposals for different artefact types', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateStandardName, standardId1),
        createProposal(ChangeProposalType.addRule, standardId1),
        createProposal(
          ChangeProposalType.updateStandardDescription,
          standardId2,
        ),
        createProposal(ChangeProposalType.updateCommandName, recipeId1),
        createProposal(ChangeProposalType.updateCommandDescription, recipeId1),
        createProposal(ChangeProposalType.updateCommandName, recipeId2),
        createProposal(ChangeProposalType.updateSkillName, skillId1),
        createProposal(ChangeProposalType.updateSkillPrompt, skillId1),
        createProposal(ChangeProposalType.addSkillFile, skillId2),
      ];

      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue(proposals);
      });

      it('counts proposals for first standard', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.get(standardId1)).toBe(2);
      });

      it('counts proposals for second standard', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.get(standardId2)).toBe(1);
      });

      it('counts proposals for first command', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId1)).toBe(2);
      });

      it('counts proposals for second command', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId2)).toBe(1);
      });

      it('counts proposals for first skill', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.get(skillId1)).toBe(2);
      });

      it('counts proposals for second skill', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.get(skillId2)).toBe(1);
      });

      it('counts total standards', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.size).toBe(2);
      });

      it('counts total commands', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.size).toBe(2);
      });

      it('counts total skills', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(2);
      });
    });

    describe('when space has only standard proposals', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateStandardName, standardId1),
        createProposal(ChangeProposalType.updateRule, standardId1),
        createProposal(ChangeProposalType.deleteRule, standardId1),
      ];

      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue(proposals);
      });

      it('counts standard proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.get(standardId1)).toBe(3);
      });

      it('has no command proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.size).toBe(0);
      });

      it('has no skill proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(0);
      });
    });

    describe('when space has only command proposals', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateCommandName, recipeId1),
        createProposal(ChangeProposalType.updateCommandDescription, recipeId1),
      ];

      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue(proposals);
      });

      it('has no standard proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.size).toBe(0);
      });

      it('counts command proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId1)).toBe(2);
      });

      it('has no skill proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(0);
      });
    });

    describe('when space has only skill proposals', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateSkillName, skillId1),
        createProposal(ChangeProposalType.updateSkillFileContent, skillId1),
        createProposal(ChangeProposalType.deleteSkillFile, skillId1),
      ];

      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue(proposals);
      });

      it('has no standard proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.size).toBe(0);
      });

      it('has no command proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.size).toBe(0);
      });

      it('counts skill proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.get(skillId1)).toBe(3);
      });
    });
  });
});
