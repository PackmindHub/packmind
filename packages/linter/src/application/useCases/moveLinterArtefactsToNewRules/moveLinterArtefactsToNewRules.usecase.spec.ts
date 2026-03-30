import {
  createOrganizationId,
  createRuleId,
  createUserId,
  ILinterPort,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { MoveLinterArtefactsToNewRulesUseCase } from './moveLinterArtefactsToNewRules.usecase';
import { SoftDeleteLinterArtefactsByRuleUseCase } from '../softDeleteLinterArtefactsByRule/softDeleteLinterArtefactsByRule.usecase';

describe('MoveLinterArtefactsToNewRulesUseCase', () => {
  let useCase: MoveLinterArtefactsToNewRulesUseCase;
  let linterPort: jest.Mocked<ILinterPort>;
  let softDeleteUseCase: jest.Mocked<SoftDeleteLinterArtefactsByRuleUseCase>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());
  const oldRuleId1 = createRuleId(uuidv4());
  const newRuleId1 = createRuleId(uuidv4());
  const oldRuleId2 = createRuleId(uuidv4());
  const newRuleId2 = createRuleId(uuidv4());

  beforeEach(() => {
    linterPort = {
      copyLinterArtefacts: jest.fn().mockResolvedValue({
        copiedProgramsCount: 1,
        copiedAssessmentsCount: 1,
        copiedHeuristicsCount: 1,
        copiedMetadataCount: 1,
      }),
    } as unknown as jest.Mocked<ILinterPort>;

    softDeleteUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SoftDeleteLinterArtefactsByRuleUseCase>;

    useCase = new MoveLinterArtefactsToNewRulesUseCase(
      linterPort,
      softDeleteUseCase,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when moving artefacts for a single rule mapping', () => {
    const command = {
      ruleMappings: [{ oldRuleId: oldRuleId1, newRuleId: newRuleId1 }],
      organizationId,
      userId,
    };

    it('calls copyLinterArtefacts with correct parameters', async () => {
      await useCase.execute(command);

      expect(linterPort.copyLinterArtefacts).toHaveBeenCalledWith({
        oldRuleId: oldRuleId1,
        newRuleId: newRuleId1,
        organizationId,
        userId,
      });
    });

    it('calls softDeleteLinterArtefactsByRule for the old rule', async () => {
      await useCase.execute(command);

      expect(softDeleteUseCase.execute).toHaveBeenCalledWith({
        ruleId: oldRuleId1,
        userId,
        organizationId,
      });
    });

    it('returns correct counts', async () => {
      const result = await useCase.execute(command);

      expect(result.copiedCount).toBe(4);
    });

    it('returns correct soft-deleted count', async () => {
      const result = await useCase.execute(command);

      expect(result.softDeletedCount).toBe(1);
    });
  });

  describe('when moving artefacts for multiple rule mappings', () => {
    const command = {
      ruleMappings: [
        { oldRuleId: oldRuleId1, newRuleId: newRuleId1 },
        { oldRuleId: oldRuleId2, newRuleId: newRuleId2 },
      ],
      organizationId,
      userId,
    };

    it('calls copyLinterArtefacts for each rule mapping', async () => {
      await useCase.execute(command);

      expect(linterPort.copyLinterArtefacts).toHaveBeenCalledTimes(2);
    });

    it('calls softDeleteLinterArtefactsByRule for each old rule', async () => {
      await useCase.execute(command);

      expect(softDeleteUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('returns aggregated copied count', async () => {
      const result = await useCase.execute(command);

      expect(result.copiedCount).toBe(8);
    });

    it('returns aggregated soft-deleted count', async () => {
      const result = await useCase.execute(command);

      expect(result.softDeletedCount).toBe(2);
    });
  });

  describe('when there are no rule mappings', () => {
    const command = {
      ruleMappings: [],
      organizationId,
      userId,
    };

    it('does not call copyLinterArtefacts', async () => {
      await useCase.execute(command);

      expect(linterPort.copyLinterArtefacts).not.toHaveBeenCalled();
    });

    it('does not call softDeleteLinterArtefactsByRule', async () => {
      await useCase.execute(command);

      expect(softDeleteUseCase.execute).not.toHaveBeenCalled();
    });

    it('returns zero counts', async () => {
      const result = await useCase.execute(command);

      expect(result).toEqual({ copiedCount: 0, softDeletedCount: 0 });
    });
  });

  describe('when copy fails', () => {
    it('throws the error without calling soft-delete', async () => {
      linterPort.copyLinterArtefacts.mockRejectedValue(
        new Error('Copy failed'),
      );

      const command = {
        ruleMappings: [{ oldRuleId: oldRuleId1, newRuleId: newRuleId1 }],
        organizationId,
        userId,
      };

      await expect(useCase.execute(command)).rejects.toThrow('Copy failed');
    });
  });

  describe('when soft-delete fails', () => {
    it('throws the error', async () => {
      softDeleteUseCase.execute.mockRejectedValue(
        new Error('Soft-delete failed'),
      );

      const command = {
        ruleMappings: [{ oldRuleId: oldRuleId1, newRuleId: newRuleId1 }],
        organizationId,
        userId,
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Soft-delete failed',
      );
    });
  });
});
