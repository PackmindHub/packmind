import { UpdateRuleDetectionHeuristicsUseCase } from './updateRuleDetectionHeuristics.usecase';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  createDetectionHeuristicsId,
  createRuleId,
  createOrganizationId,
  createUserId,
  DetectionHeuristics,
  ProgrammingLanguage,
  UpdateRuleDetectionHeuristicsCommand,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';

describe('UpdateRuleDetectionHeuristicsUseCase', () => {
  let useCase: UpdateRuleDetectionHeuristicsUseCase;
  let heuristicsRepository: jest.Mocked<IRuleDetectionHeuristicsRepository>;
  let linterRepositories: jest.Mocked<ILinterRepositories>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    heuristicsRepository = {
      getHeuristicsById: jest.fn(),
      updateHeuristics: jest.fn(),
      upsertHeuristics: jest.fn(),
      getHeuristicsForRule: jest.fn(),
    } as unknown as jest.Mocked<IRuleDetectionHeuristicsRepository>;

    linterRepositories = {
      getRuleDetectionHeuristicsRepository: jest
        .fn()
        .mockReturnValue(heuristicsRepository),
      getRuleDetectionAssessmentRepository: jest.fn(),
      getDetectionProgramRepository: jest.fn(),
      getActiveDetectionProgramRepository: jest.fn(),
      getDetectionProgramMetadataRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    stubbedLogger = stubLogger();

    useCase = new UpdateRuleDetectionHeuristicsUseCase(
      linterRepositories,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when updating heuristics successfully', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'old heuristics',
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: 'new heuristics',
      };

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: 'new heuristics',
      };
    });

    it('retrieves existing heuristics by id', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsById).toHaveBeenCalledWith(
        heuristicsId,
      );
    });

    it('calls update with correct parameters', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.updateHeuristics).toHaveBeenCalledWith(
        heuristicsId,
        'new heuristics',
      );
    });

    it('returns updated detection heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(updatedHeuristics);
    });
  });

  describe('when detection heuristics not found', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    let command: UpdateRuleDetectionHeuristicsCommand;

    beforeEach(() => {
      heuristicsRepository.getHeuristicsById.mockResolvedValue(null);

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: 'new heuristics',
      };
    });

    it('throws error indicating heuristics not found', async () => {
      await expect(useCase.execute(command)).rejects.toThrow(
        `Detection heuristics with id ${heuristicsId} not found`,
      );
    });

    describe('when heuristics not found', () => {
      it('does not call update', async () => {
        await expect(useCase.execute(command)).rejects.toThrow();

        expect(heuristicsRepository.updateHeuristics).not.toHaveBeenCalled();
      });
    });
  });

  describe('when updating empty heuristics', () => {
    it('allows updating to empty string', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.PYTHON,
        heuristics: 'existing heuristics',
      };

      const updatedHeuristics: DetectionHeuristics = {
        ...existingHeuristics,
        heuristics: '',
      };

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();

      const command: UpdateRuleDetectionHeuristicsCommand = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: '',
      };

      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.heuristics).toBe('');
    });
  });

  describe('when retrieval after update fails', () => {
    it('throws error indicating retrieval failure', async () => {
      const heuristicsId = createDetectionHeuristicsId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const existingHeuristics: DetectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.JAVA,
        heuristics: 'old heuristics',
      };

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(null);
      heuristicsRepository.updateHeuristics.mockResolvedValue();

      const command: UpdateRuleDetectionHeuristicsCommand = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: 'new heuristics',
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'Failed to retrieve updated heuristics',
      );
    });
  });

  describe('when heuristics property preserves other fields', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    let existingHeuristics: DetectionHeuristics;
    let updatedHeuristics: DetectionHeuristics;
    let command: UpdateRuleDetectionHeuristicsCommand;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language: ProgrammingLanguage.GO,
        heuristics: 'old heuristics',
      };

      updatedHeuristics = {
        ...existingHeuristics,
        heuristics: 'new heuristics',
      };

      heuristicsRepository.getHeuristicsById
        .mockResolvedValueOnce(existingHeuristics)
        .mockResolvedValueOnce(updatedHeuristics);
      heuristicsRepository.updateHeuristics.mockResolvedValue();

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        detectionHeuristicsId: heuristicsId,
        heuristics: 'new heuristics',
      };
    });

    it('preserves ruleId field', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.ruleId).toBe(ruleId);
    });

    it('preserves language field', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.language).toBe(ProgrammingLanguage.GO);
    });
  });
});
