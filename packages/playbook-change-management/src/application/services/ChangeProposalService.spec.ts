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
      artefactId: string,
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
      status: ChangeProposalStatus.pending,
      createdBy: createUserId('user-id'),
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

        expect(result.standards.get(standardId1)).toBe(1);
      });

      it('counts only pending command proposals', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.commands.get(recipeId1)).toBe(1);
      });

      it('excludes non-pending skill proposals entirely', async () => {
        const result = await service.groupProposalsByArtefact(spaceId);

        expect(result.skills.size).toBe(0);
      });
    });
  });

  describe('findProposalsByArtefact', () => {
    const standardId = createStandardId('standard-1');
    const recipeId = createRecipeId('recipe-1');

    const createProposal = <T extends ChangeProposalType>(
      type: T,
      artefactId: string,
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
