import { CreateDetectionHeuristicsUseCase } from './createDetectionHeuristics.usecase';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  createDetectionHeuristicsId,
  createRuleId,
  createOrganizationId,
  createUserId,
  DetectionHeuristics,
  ProgrammingLanguage,
  CreateDetectionHeuristicsCommand,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';

describe('CreateDetectionHeuristicsUseCase', () => {
  let useCase: CreateDetectionHeuristicsUseCase;
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

    useCase = new CreateDetectionHeuristicsUseCase(
      linterRepositories,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when heuristics do not exist', () => {
    const ruleId = createRuleId(uuidv4());
    const language = ProgrammingLanguage.TYPESCRIPT;
    let command: CreateDetectionHeuristicsCommand;

    beforeEach(() => {
      heuristicsRepository.getHeuristicsForRule.mockResolvedValue(null);

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        ruleId,
        language,
      };
    });

    it('checks if heuristics exist for rule and language', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsForRule).toHaveBeenCalledWith(
        ruleId,
        language,
      );
    });

    it('creates new heuristics with correct structure', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.upsertHeuristics).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId,
          language,
          heuristics: '',
        }),
      );
    });

    it('generates unique ID for new heuristics', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.upsertHeuristics).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
        }),
      );
    });

    it('returns created heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(
        expect.objectContaining({
          ruleId,
          language,
          heuristics: '',
        }),
      );
    });

    it('returns heuristics with non-null ID', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.id).toBeDefined();
      expect(typeof result.detectionHeuristics.id).toBe('string');
    });
  });

  describe('when heuristics already exist', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    const language = ProgrammingLanguage.PYTHON;
    let existingHeuristics: DetectionHeuristics;
    let command: CreateDetectionHeuristicsCommand;

    beforeEach(() => {
      existingHeuristics = {
        id: heuristicsId,
        ruleId,
        language,
        heuristics: 'Existing heuristics content',
      };

      heuristicsRepository.getHeuristicsForRule.mockResolvedValue(
        existingHeuristics,
      );

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        ruleId,
        language,
      };
    });

    it('checks if heuristics exist', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsForRule).toHaveBeenCalledWith(
        ruleId,
        language,
      );
    });

    it('does not create new heuristics', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.upsertHeuristics).not.toHaveBeenCalled();
    });

    it('returns existing heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(existingHeuristics);
    });

    it('preserves existing heuristics content', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics.heuristics).toBe(
        'Existing heuristics content',
      );
    });
  });

  describe('when querying different languages for same rule', () => {
    const ruleId = createRuleId(uuidv4());

    it('creates TypeScript heuristics independently', async () => {
      heuristicsRepository.getHeuristicsForRule.mockResolvedValue(null);

      const tsCommand: CreateDetectionHeuristicsCommand = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
      };

      const result = await useCase.execute(tsCommand);

      expect(result.detectionHeuristics.language).toBe(
        ProgrammingLanguage.TYPESCRIPT,
      );
      expect(heuristicsRepository.upsertHeuristics).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        }),
      );
    });

    it('creates JavaScript heuristics independently', async () => {
      heuristicsRepository.getHeuristicsForRule.mockResolvedValue(null);

      const jsCommand: CreateDetectionHeuristicsCommand = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        ruleId,
        language: ProgrammingLanguage.JAVASCRIPT,
      };

      const result = await useCase.execute(jsCommand);

      expect(result.detectionHeuristics.language).toBe(
        ProgrammingLanguage.JAVASCRIPT,
      );
      expect(heuristicsRepository.upsertHeuristics).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        }),
      );
    });
  });
});
