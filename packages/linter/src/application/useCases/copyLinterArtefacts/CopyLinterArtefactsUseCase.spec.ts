import {
  createOrganizationId,
  createUserId,
  createRuleId,
  ILinterPort,
  CopyDetectionHeuristicsResponse,
  CopyRuleDetectionAssessmentsResponse,
  CopyDetectionProgramsToNewRuleResponse,
} from '@packmind/types';
import { CopyLinterArtefactsUseCase } from './CopyLinterArtefactsUseCase';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';

describe('CopyLinterArtefactsUseCase', () => {
  let useCase: CopyLinterArtefactsUseCase;
  let linterPort: jest.Mocked<ILinterPort>;

  const oldRuleId = createRuleId(uuidv4());
  const newRuleId = createRuleId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  const command = {
    oldRuleId,
    newRuleId,
    organizationId,
    userId,
  };

  beforeEach(() => {
    linterPort = {
      copyDetectionHeuristics: jest.fn(),
      copyRuleDetectionAssessments: jest.fn(),
      copyDetectionProgramsToNewRule: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;

    useCase = new CopyLinterArtefactsUseCase(linterPort, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when copying all linter artefacts', () => {
    it('returns aggregated counts from all three operations', async () => {
      const heuristicsResponse: CopyDetectionHeuristicsResponse = {
        copiedHeuristicsCount: 2,
      };
      const assessmentsResponse: CopyRuleDetectionAssessmentsResponse = {
        copiedAssessmentsCount: 3,
      };
      const programsResponse: CopyDetectionProgramsToNewRuleResponse = {
        copiedProgramsCount: 5,
        copiedMetadataCount: 2,
      };

      linterPort.copyDetectionHeuristics.mockResolvedValue(heuristicsResponse);
      linterPort.copyRuleDetectionAssessments.mockResolvedValue(
        assessmentsResponse,
      );
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue(
        programsResponse,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual({
        copiedHeuristicsCount: 2,
        copiedAssessmentsCount: 3,
        copiedProgramsCount: 5,
        copiedMetadataCount: 2,
      });
    });

    it('calls copyDetectionHeuristics via linterPort', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 0,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 0,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 0,
        copiedMetadataCount: 0,
      });

      await useCase.execute(command);

      expect(linterPort.copyDetectionHeuristics).toHaveBeenCalledWith(command);
    });

    it('calls copyRuleDetectionAssessments via linterPort', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 0,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 0,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 0,
        copiedMetadataCount: 0,
      });

      await useCase.execute(command);

      expect(linterPort.copyRuleDetectionAssessments).toHaveBeenCalledWith(
        command,
      );
    });

    it('calls copyDetectionProgramsToNewRule via linterPort', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 0,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 0,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 0,
        copiedMetadataCount: 0,
      });

      await useCase.execute(command);

      expect(linterPort.copyDetectionProgramsToNewRule).toHaveBeenCalledWith(
        command,
      );
    });

    it('calls copyDetectionHeuristics exactly once', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 1,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 1,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 1,
        copiedMetadataCount: 0,
      });

      await useCase.execute(command);

      expect(linterPort.copyDetectionHeuristics).toHaveBeenCalledTimes(1);
    });

    it('calls copyRuleDetectionAssessments exactly once', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 1,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 1,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 1,
        copiedMetadataCount: 0,
      });

      await useCase.execute(command);

      expect(linterPort.copyRuleDetectionAssessments).toHaveBeenCalledTimes(1);
    });

    it('calls copyDetectionProgramsToNewRule exactly once', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 1,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 1,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 1,
        copiedMetadataCount: 0,
      });

      await useCase.execute(command);

      expect(linterPort.copyDetectionProgramsToNewRule).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('when no artefacts exist', () => {
    it('returns all counts as zero', async () => {
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 0,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 0,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 0,
        copiedMetadataCount: 0,
      });

      const result = await useCase.execute(command);

      expect(result).toEqual({
        copiedHeuristicsCount: 0,
        copiedAssessmentsCount: 0,
        copiedProgramsCount: 0,
        copiedMetadataCount: 0,
      });
    });
  });

  describe('when one operation has artefacts', () => {
    describe('when only heuristics exist', () => {
      beforeEach(() => {
        linterPort.copyDetectionHeuristics.mockResolvedValue({
          copiedHeuristicsCount: 4,
        });
        linterPort.copyRuleDetectionAssessments.mockResolvedValue({
          copiedAssessmentsCount: 0,
        });
        linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
          copiedProgramsCount: 0,
        });
      });

      it('returns correct heuristics count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedHeuristicsCount).toBe(4);
      });

      it('returns zero assessments count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedAssessmentsCount).toBe(0);
      });

      it('returns zero programs count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedProgramsCount).toBe(0);
      });
    });

    describe('when only assessments exist', () => {
      beforeEach(() => {
        linterPort.copyDetectionHeuristics.mockResolvedValue({
          copiedHeuristicsCount: 0,
        });
        linterPort.copyRuleDetectionAssessments.mockResolvedValue({
          copiedAssessmentsCount: 6,
        });
        linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
          copiedProgramsCount: 0,
        });
      });

      it('returns zero heuristics count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedHeuristicsCount).toBe(0);
      });

      it('returns correct assessments count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedAssessmentsCount).toBe(6);
      });

      it('returns zero programs count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedProgramsCount).toBe(0);
      });
    });

    describe('when only programs exist', () => {
      beforeEach(() => {
        linterPort.copyDetectionHeuristics.mockResolvedValue({
          copiedHeuristicsCount: 0,
        });
        linterPort.copyRuleDetectionAssessments.mockResolvedValue({
          copiedAssessmentsCount: 0,
        });
        linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
          copiedProgramsCount: 7,
          copiedMetadataCount: 3,
        });
      });

      it('returns zero heuristics count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedHeuristicsCount).toBe(0);
      });

      it('returns zero assessments count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedAssessmentsCount).toBe(0);
      });

      it('returns correct programs count', async () => {
        const result = await useCase.execute(command);

        expect(result.copiedProgramsCount).toBe(7);
      });
    });
  });

  describe('when one operation fails', () => {
    it('throws error from copyDetectionHeuristics', async () => {
      const error = new Error('Failed to copy heuristics');
      linterPort.copyDetectionHeuristics.mockRejectedValue(error);
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 1,
      });
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 1,
        copiedMetadataCount: 0,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to copy heuristics',
      );
    });

    it('throws error from copyRuleDetectionAssessments', async () => {
      const error = new Error('Failed to copy assessments');
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 1,
      });
      linterPort.copyRuleDetectionAssessments.mockRejectedValue(error);
      linterPort.copyDetectionProgramsToNewRule.mockResolvedValue({
        copiedProgramsCount: 1,
        copiedMetadataCount: 0,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to copy assessments',
      );
    });

    it('throws error from copyDetectionProgramsToNewRule', async () => {
      const error = new Error('Failed to copy programs');
      linterPort.copyDetectionHeuristics.mockResolvedValue({
        copiedHeuristicsCount: 1,
      });
      linterPort.copyRuleDetectionAssessments.mockResolvedValue({
        copiedAssessmentsCount: 1,
      });
      linterPort.copyDetectionProgramsToNewRule.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to copy programs',
      );
    });
  });

  describe('when operations execute in parallel', () => {
    it('completes all operations concurrently', async () => {
      const executionOrder: string[] = [];

      linterPort.copyDetectionHeuristics.mockImplementation(async () => {
        executionOrder.push('heuristics-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push('heuristics-end');
        return { copiedHeuristicsCount: 1 };
      });

      linterPort.copyRuleDetectionAssessments.mockImplementation(async () => {
        executionOrder.push('assessments-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push('assessments-end');
        return { copiedAssessmentsCount: 1 };
      });

      linterPort.copyDetectionProgramsToNewRule.mockImplementation(async () => {
        executionOrder.push('programs-start');
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push('programs-end');
        return { copiedProgramsCount: 1 };
      });

      await useCase.execute(command);

      expect(executionOrder.slice(0, 3)).toEqual([
        'heuristics-start',
        'assessments-start',
        'programs-start',
      ]);
    });
  });
});
