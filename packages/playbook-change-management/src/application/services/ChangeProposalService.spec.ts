import {
  ChangeProposal,
  ChangeProposalCaptureMode,
  ChangeProposalStatus,
  ChangeProposalType,
  createChangeProposalId,
  createRecipeId,
  createRuleId,
  createSkillId,
  createSpaceId,
  createStandardId,
  createUserId,
  CreateChangeProposalCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { DataSource } from 'typeorm';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalService } from './ChangeProposalService';

describe('ChangeProposalService', () => {
  let service: ChangeProposalService;
  let repository: jest.Mocked<IChangeProposalRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const spaceId = createSpaceId('space-id');

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByArtefactId: jest.fn(),
      findBySpaceId: jest.fn(),
      findExistingPending: jest.fn(),
      update: jest.fn(),
      cancelPendingByArtefactId: jest.fn(),
    } as unknown as jest.Mocked<IChangeProposalRepository>;

    dataSource = {
      manager: {
        transaction: jest.fn(),
      },
    } as unknown as jest.Mocked<DataSource>;

    service = new ChangeProposalService(repository, dataSource, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChangeProposal', () => {
    const recipeId = createRecipeId('recipe-id');
    const userId = createUserId('user-id');
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
        message: '',
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

    it('sets message from command', async () => {
      const commandWithMessage = {
        ...command,
        message: 'Refactored command names',
      };
      const { changeProposal } = await service.createChangeProposal(
        commandWithMessage,
        artefactVersion,
      );

      expect(changeProposal.message).toBe('Refactored command names');
    });

    describe('when message is not provided', () => {
      it('defaults message to empty string', async () => {
        const { changeProposal } = await service.createChangeProposal(
          command,
          artefactVersion,
        );

        expect(changeProposal.message).toBe('');
      });
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
    const recipeId = createRecipeId('recipe-id');
    const userId = createUserId('user-id');

    describe('when a pending duplicate exists', () => {
      const existingProposal: ChangeProposal<ChangeProposalType> = {
        id: createChangeProposalId('change-proposal-id'),
        type: ChangeProposalType.updateCommandName,
        artefactId: recipeId,
        artefactVersion: 1,
        spaceId,
        payload: { oldValue: 'old name', newValue: 'new name' },
        captureMode: ChangeProposalCaptureMode.commit,
        message: '',
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

  describe('groupProposalsByArtefact', () => {
    const standardId1 = createStandardId('standard-1');
    const standardId2 = createStandardId('standard-2');
    const recipeId1 = createRecipeId('recipe-1');
    const recipeId2 = createRecipeId('recipe-2');
    const skillId1 = createSkillId('skill-1');
    const skillId2 = createSkillId('skill-2');

    const createProposal = <T extends ChangeProposalType>(
      type: T,
      artefactId: string | null,
      createdAt: Date = new Date(),
    ): ChangeProposal<T> => ({
      id: createChangeProposalId('change-proposal-id'),
      type,
      artefactId: artefactId as ChangeProposal<T>['artefactId'],
      artefactVersion: 1,
      spaceId,
      payload: {
        oldValue: 'old',
        newValue: 'new',
      } as ChangeProposal<T>['payload'],
      captureMode: ChangeProposalCaptureMode.commit,
      message: '',
      status: ChangeProposalStatus.pending,
      createdBy: createUserId('user-id'),
      resolvedBy: null,
      resolvedAt: null,
      createdAt,
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

        expect(result.standards.get(standardId1)?.count).toBe(2);
      });

      it('counts proposals for second standard', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.get(standardId2)?.count).toBe(1);
      });

      it('counts proposals for first command', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId1)?.count).toBe(2);
      });

      it('counts proposals for second command', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId2)?.count).toBe(1);
      });

      it('counts proposals for first skill', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.get(skillId1)?.count).toBe(2);
      });

      it('counts proposals for second skill', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.get(skillId2)?.count).toBe(1);
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

    describe('when tracking lastContributedAt', () => {
      const olderDate = new Date('2024-01-01T00:00:00Z');
      const newerDate = new Date('2024-06-15T12:00:00Z');

      const proposals = [
        createProposal(
          ChangeProposalType.updateStandardName,
          standardId1,
          olderDate,
        ),
        createProposal(ChangeProposalType.addRule, standardId1, newerDate),
        createProposal(
          ChangeProposalType.updateCommandName,
          recipeId1,
          newerDate,
        ),
        createProposal(
          ChangeProposalType.updateCommandDescription,
          recipeId1,
          olderDate,
        ),
        createProposal(ChangeProposalType.updateSkillName, skillId1, olderDate),
      ];

      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue(proposals);
      });

      it('tracks max createdAt for standards', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.get(standardId1)?.lastContributedAt).toEqual(
          newerDate,
        );
      });

      it('tracks max createdAt for commands', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId1)?.lastContributedAt).toEqual(
          newerDate,
        );
      });

      it('tracks createdAt for skills with single proposal', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.get(skillId1)?.lastContributedAt).toEqual(
          olderDate,
        );
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

        expect(result.standards.get(standardId1)?.count).toBe(3);
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

        expect(result.commands.get(recipeId1)?.count).toBe(2);
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

        expect(result.skills.get(skillId1)?.count).toBe(3);
      });
    });

    describe('when space has createCommand proposals', () => {
      const createCommandProposal = createProposal(
        ChangeProposalType.createCommand,
        null as unknown as ReturnType<typeof createStandardId>,
      );

      it('places createCommand proposals in creations array, not commands map', async () => {
        repository.findBySpaceId.mockResolvedValue([createCommandProposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.creations).toHaveLength(1);
      });

      it('does not add createCommand proposals to the commands map', async () => {
        repository.findBySpaceId.mockResolvedValue([createCommandProposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.size).toBe(0);
      });

      it('accumulates multiple createCommand proposals in creations', async () => {
        const second = createProposal(
          ChangeProposalType.createCommand,
          null as unknown as ReturnType<typeof createStandardId>,
        );
        repository.findBySpaceId.mockResolvedValue([
          createCommandProposal,
          second,
        ]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.creations).toHaveLength(2);
      });
    });

    describe('when space has createStandard proposals', () => {
      const createStandardProposal = createProposal(
        ChangeProposalType.createStandard,
        null as unknown as ReturnType<typeof createStandardId>,
      );

      it('places createStandard proposals in creations array, not standards map', async () => {
        repository.findBySpaceId.mockResolvedValue([createStandardProposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.creations).toHaveLength(1);
      });

      it('does not add createStandard proposals to the standards map', async () => {
        repository.findBySpaceId.mockResolvedValue([createStandardProposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.size).toBe(0);
      });
    });

    describe('when space has createSkill proposals', () => {
      const createSkillProposal = createProposal(
        ChangeProposalType.createSkill,
        null as unknown as ReturnType<typeof createSkillId>,
      );

      it('places createSkill proposals in creations array, not skills map', async () => {
        repository.findBySpaceId.mockResolvedValue([createSkillProposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.creations).toHaveLength(1);
      });

      it('does not add createSkill proposals to the skills map', async () => {
        repository.findBySpaceId.mockResolvedValue([createSkillProposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(0);
      });
    });

    describe('when proposals include removeCommand type', () => {
      it('groups removeCommand proposals under commands', async () => {
        const proposal = createProposal(
          ChangeProposalType.removeCommand,
          recipeId1,
        );
        repository.findBySpaceId.mockResolvedValue([proposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.has(recipeId1)).toBe(true);
      });
    });

    describe('when proposals include removeStandard type', () => {
      it('groups removeStandard proposals under standards', async () => {
        const proposal = createProposal(
          ChangeProposalType.removeStandard,
          standardId1,
        );
        repository.findBySpaceId.mockResolvedValue([proposal]);

        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.has(standardId1)).toBe(true);
      });
    });

    describe('when space has a mix of pending and non-pending proposals', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateStandardName, standardId1),
        {
          ...createProposal(ChangeProposalType.addRule, standardId1),
          status: ChangeProposalStatus.applied,
        },
        {
          ...createProposal(ChangeProposalType.updateCommandName, recipeId1),
          status: ChangeProposalStatus.rejected,
        },
        createProposal(ChangeProposalType.updateCommandDescription, recipeId1),
        {
          ...createProposal(ChangeProposalType.updateSkillName, skillId1),
          status: ChangeProposalStatus.applied,
        },
      ];

      beforeEach(() => {
        repository.findBySpaceId.mockResolvedValue(proposals);
      });

      it('counts only pending standard proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.standards.get(standardId1)?.count).toBe(1);
      });

      it('counts only pending command proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId1)?.count).toBe(1);
      });

      it('excludes non-pending skill proposals entirely', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(0);
      });
    });
  });

  describe('cancelPendingByArtefactId', () => {
    const userId = createUserId('user-id');
    const artefactId = createStandardId('standard-id');

    it('delegates to repository', async () => {
      repository.cancelPendingByArtefactId.mockResolvedValue(undefined);

      await service.cancelPendingByArtefactId(spaceId, artefactId, userId);

      expect(repository.cancelPendingByArtefactId).toHaveBeenCalledWith(
        spaceId,
        artefactId,
        userId,
      );
    });
  });

  describe('migrateProposalsForMovedArtefact', () => {
    const sourceSpaceId = createSpaceId('source-space');
    const destinationSpaceId = createSpaceId('dest-space');
    const oldArtefactId = createStandardId('old-artefact');
    const newArtefactId = 'new-artefact-id';

    const createProposal = <T extends ChangeProposalType>(
      type: T,
      status: ChangeProposalStatus = ChangeProposalStatus.pending,
    ): ChangeProposal<T> => ({
      id: createChangeProposalId(`cp-${Math.random()}`),
      type,
      artefactId: oldArtefactId as ChangeProposal<T>['artefactId'],
      artefactVersion: 1,
      spaceId: sourceSpaceId,
      payload: {
        oldValue: 'old',
        newValue: 'new',
      } as ChangeProposal<T>['payload'],
      captureMode: ChangeProposalCaptureMode.commit,
      message: 'test message',
      status,
      decision: null,
      createdBy: createUserId('user-id'),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    });

    let mockEntityManager: {
      save: jest.Mock;
      getRepository: jest.Mock;
    };
    let mockQueryBuilder: {
      softDelete: jest.Mock;
      where: jest.Mock;
      andWhere: jest.Mock;
      execute: jest.Mock;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      mockEntityManager = {
        save: jest.fn().mockResolvedValue(undefined),
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        }),
      };
      (dataSource.manager.transaction as jest.Mock).mockImplementation(
        async (cb: (em: typeof mockEntityManager) => Promise<void>) => {
          await cb(mockEntityManager);
        },
      );
    });

    describe('when old artefact has proposals', () => {
      const pendingProposal = createProposal(
        ChangeProposalType.updateStandardName,
        ChangeProposalStatus.pending,
      );
      const appliedProposal = createProposal(
        ChangeProposalType.addRule,
        ChangeProposalStatus.applied,
      );
      const rejectedProposal = createProposal(
        ChangeProposalType.updateStandardDescription,
        ChangeProposalStatus.rejected,
      );

      beforeEach(() => {
        repository.findByArtefactId.mockResolvedValue([
          pendingProposal,
          appliedProposal,
          rejectedProposal,
        ]);
      });

      it('fetches proposals from the source space', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(repository.findByArtefactId).toHaveBeenCalledWith(
          sourceSpaceId,
          oldArtefactId,
        );
      });

      it('saves a copy for each proposal', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockEntityManager.save).toHaveBeenCalledTimes(3);
      });

      it('saves copies with new artefactId and spaceId', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockEntityManager.save).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            artefactId: newArtefactId,
            spaceId: destinationSpaceId,
          }),
        );
      });

      it('generates distinct IDs for copies', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        const savedIds = (mockEntityManager.save as jest.Mock).mock.calls.map(
          ([, proposal]: [unknown, ChangeProposal<ChangeProposalType>]) =>
            proposal.id,
        );
        const uniqueIds = new Set(savedIds);
        expect(uniqueIds.size).toBe(3);
      });

      it('preserves original proposal fields in the copy', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockEntityManager.save).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: pendingProposal.type,
            message: pendingProposal.message,
            captureMode: pendingProposal.captureMode,
            createdBy: pendingProposal.createdBy,
            status: pendingProposal.status,
          }),
        );
      });

      it('copies proposals regardless of status', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        const savedStatuses = (
          mockEntityManager.save as jest.Mock
        ).mock.calls.map(
          ([, proposal]: [unknown, ChangeProposal<ChangeProposalType>]) =>
            proposal.status,
        );
        expect(savedStatuses).toEqual([
          ChangeProposalStatus.pending,
          ChangeProposalStatus.applied,
          ChangeProposalStatus.rejected,
        ]);
      });

      it('soft-deletes originals in the source space', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockQueryBuilder.softDelete).toHaveBeenCalled();
      });

      it('filters soft-delete by source spaceId', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'space_id = :spaceId',
          { spaceId: sourceSpaceId },
        );
      });

      it('filters soft-delete by old artefactId', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'artefact_id = :artefactId',
          { artefactId: oldArtefactId },
        );
      });

      it('executes the soft-delete query', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockQueryBuilder.execute).toHaveBeenCalled();
      });
    });

    describe('when ruleMappings are provided', () => {
      const oldRuleId = createRuleId('old-rule-1');
      const newRuleId = createRuleId('new-rule-1');
      const ruleMappings = [
        { oldRuleId: oldRuleId as string, newRuleId: newRuleId as string },
      ];

      const createRuleProposal = <T extends ChangeProposalType>(
        type: T,
        payload: ChangeProposal<T>['payload'],
      ): ChangeProposal<T> => ({
        id: createChangeProposalId(`cp-${Math.random()}`),
        type,
        artefactId: oldArtefactId as ChangeProposal<T>['artefactId'],
        artefactVersion: 1,
        spaceId: sourceSpaceId,
        payload,
        captureMode: ChangeProposalCaptureMode.commit,
        message: 'test message',
        status: ChangeProposalStatus.pending,
        decision: null,
        createdBy: createUserId('user-id'),
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      it('remaps targetId in updateRule proposals', async () => {
        const updateRuleProposal = createRuleProposal(
          ChangeProposalType.updateRule,
          {
            targetId: oldRuleId,
            oldValue: 'old content',
            newValue: 'new content',
          },
        );
        repository.findByArtefactId.mockResolvedValue([updateRuleProposal]);

        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
          ruleMappings,
        });

        expect(mockEntityManager.save).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            payload: expect.objectContaining({
              targetId: newRuleId,
            }),
          }),
        );
      });

      it('remaps targetId and item.id in deleteRule proposals', async () => {
        const deleteRuleProposal = createRuleProposal(
          ChangeProposalType.deleteRule,
          {
            targetId: oldRuleId,
            item: { id: oldRuleId, content: 'rule content' },
          },
        );
        repository.findByArtefactId.mockResolvedValue([deleteRuleProposal]);

        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
          ruleMappings,
        });

        expect(mockEntityManager.save).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            payload: expect.objectContaining({
              targetId: newRuleId,
              item: expect.objectContaining({ id: newRuleId }),
            }),
          }),
        );
      });

      it('leaves addRule proposals unchanged', async () => {
        const addRulePayload = {
          item: { content: 'new rule content' },
        };
        const addRuleProposal = createRuleProposal(
          ChangeProposalType.addRule,
          addRulePayload,
        );
        repository.findByArtefactId.mockResolvedValue([addRuleProposal]);

        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
          ruleMappings,
        });

        expect(mockEntityManager.save).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            payload: addRulePayload,
          }),
        );
      });

      it('leaves updateRule proposals unchanged when no matching mapping exists', async () => {
        const unmappedRuleId = createRuleId('unmapped-rule');
        const payload = {
          targetId: unmappedRuleId,
          oldValue: 'old',
          newValue: 'new',
        };
        const proposal = createRuleProposal(
          ChangeProposalType.updateRule,
          payload,
        );
        repository.findByArtefactId.mockResolvedValue([proposal]);

        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
          ruleMappings,
        });

        expect(mockEntityManager.save).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            payload: expect.objectContaining({
              targetId: unmappedRuleId,
            }),
          }),
        );
      });
    });

    describe('when old artefact has no proposals', () => {
      beforeEach(() => {
        repository.findByArtefactId.mockResolvedValue([]);
      });

      it('does not save any copies', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockEntityManager.save).not.toHaveBeenCalled();
      });

      it('still executes soft-delete query', async () => {
        await service.migrateProposalsForMovedArtefact({
          sourceSpaceId,
          destinationSpaceId,
          oldArtefactId,
          newArtefactId,
        });

        expect(mockQueryBuilder.execute).toHaveBeenCalled();
      });
    });
  });

  describe('findProposalsByArtefact', () => {
    const standardId = createStandardId('standard-1');
    const recipeId = createRecipeId('recipe-1');

    const createProposal = <T extends ChangeProposalType>(
      type: T,
      artefactId: string | null,
    ): ChangeProposal<T> => ({
      id: createChangeProposalId('change-proposal-id'),
      type,
      artefactId: artefactId as ChangeProposal<T>['artefactId'],
      artefactVersion: 1,
      spaceId,
      payload: {
        oldValue: 'old',
        newValue: 'new',
      } as ChangeProposal<T>['payload'],
      captureMode: ChangeProposalCaptureMode.commit,
      message: '',
      status: ChangeProposalStatus.pending,
      createdBy: createUserId('user-id'),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    describe('when artefact has no proposals', () => {
      beforeEach(() => {
        repository.findByArtefactId.mockResolvedValue([]);
      });

      it('returns empty array', async () => {
        const result = await service.findProposalsByArtefact(
          spaceId,
          standardId,
        );

        expect(result).toEqual([]);
      });

      it('calls repository with correct parameters', async () => {
        await service.findProposalsByArtefact(spaceId, standardId);

        expect(repository.findByArtefactId).toHaveBeenCalledWith(
          spaceId,
          standardId,
        );
      });
    });

    describe('when artefact has proposals', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateStandardName, standardId),
        createProposal(ChangeProposalType.addRule, standardId),
      ];

      beforeEach(() => {
        repository.findByArtefactId.mockResolvedValue(proposals);
      });

      it('returns all proposals for the artefact', async () => {
        const result = await service.findProposalsByArtefact(
          spaceId,
          standardId,
        );

        expect(result).toEqual(proposals);
      });

      it('returns correct number of proposals', async () => {
        const result = await service.findProposalsByArtefact(
          spaceId,
          standardId,
        );

        expect(result.length).toBe(2);
      });
    });

    describe('when finding proposals for a recipe', () => {
      const proposals = [
        createProposal(ChangeProposalType.updateCommandName, recipeId),
      ];

      beforeEach(() => {
        repository.findByArtefactId.mockResolvedValue(proposals);
      });

      it('returns recipe proposals', async () => {
        const result = await service.findProposalsByArtefact(spaceId, recipeId);

        expect(result).toEqual(proposals);
      });

      it('calls repository with recipe id', async () => {
        await service.findProposalsByArtefact(spaceId, recipeId);

        expect(repository.findByArtefactId).toHaveBeenCalledWith(
          spaceId,
          recipeId,
        );
      });
    });
  });
});
