import { GetDetectionHeuristicsUseCase } from './getDetectionHeuristics.usecase';
import { IRuleDetectionHeuristicsRepository } from '../../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  createDetectionHeuristicsId,
  createRuleId,
  createOrganizationId,
  createUserId,
  DetectionHeuristics,
  ProgrammingLanguage,
  GetDetectionHeuristicsCommand,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';

describe('GetDetectionHeuristicsUseCase', () => {
  let useCase: GetDetectionHeuristicsUseCase;
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

    useCase = new GetDetectionHeuristicsUseCase(
      linterRepositories,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when detection heuristics exist', () => {
    const heuristicsId = createDetectionHeuristicsId(uuidv4());
    const ruleId = createRuleId(uuidv4());
    const language = ProgrammingLanguage.TYPESCRIPT;
    let detectionHeuristics: DetectionHeuristics;
    let command: GetDetectionHeuristicsCommand;

    beforeEach(() => {
      detectionHeuristics = {
        id: heuristicsId,
        ruleId,
        language,
        heuristics: 'Test heuristics content',
      };

      heuristicsRepository.getHeuristicsForRule.mockResolvedValue(
        detectionHeuristics,
      );

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        ruleId,
        language,
      };
    });

    it('calls repository with correct rule and language', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsForRule).toHaveBeenCalledWith(
        ruleId,
        language,
      );
    });

    it('returns detection heuristics matching the repository result', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toEqual(detectionHeuristics);
    });

    it('returns non-null detection heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).not.toBeNull();
    });
  });

  describe('when detection heuristics do not exist', () => {
    const ruleId = createRuleId(uuidv4());
    const language = ProgrammingLanguage.PYTHON;
    let command: GetDetectionHeuristicsCommand;

    beforeEach(() => {
      heuristicsRepository.getHeuristicsForRule.mockResolvedValue(null);

      command = {
        userId: createUserId(uuidv4()),
        organizationId: createOrganizationId(uuidv4()),
        ruleId,
        language,
      };
    });

    it('calls repository with correct rule and language', async () => {
      await useCase.execute(command);

      expect(heuristicsRepository.getHeuristicsForRule).toHaveBeenCalledWith(
        ruleId,
        language,
      );
    });

    it('returns null for non-existent heuristics', async () => {
      const result = await useCase.execute(command);

      expect(result.detectionHeuristics).toBeNull();
    });
  });

  describe('when querying different languages for same rule', () => {
    const ruleId = createRuleId(uuidv4());
    const tsHeuristicsId = createDetectionHeuristicsId(uuidv4());
    const jsHeuristicsId = createDetectionHeuristicsId(uuidv4());
    let tsHeuristics: DetectionHeuristics;
    let jsHeuristics: DetectionHeuristics;

    beforeEach(() => {
      tsHeuristics = {
        id: tsHeuristicsId,
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        heuristics: 'TypeScript heuristics',
      };

      jsHeuristics = {
        id: jsHeuristicsId,
        ruleId,
        language: ProgrammingLanguage.JAVASCRIPT,
        heuristics: 'JavaScript heuristics',
      };
    });

    describe('when querying for TypeScript', () => {
      it('returns TypeScript heuristics', async () => {
        heuristicsRepository.getHeuristicsForRule.mockResolvedValueOnce(
          tsHeuristics,
        );

        const tsCommand: GetDetectionHeuristicsCommand = {
          userId: createUserId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        };

        const tsResult = await useCase.execute(tsCommand);

        expect(tsResult.detectionHeuristics).toEqual(tsHeuristics);
      });

      it('returns TypeScript language', async () => {
        heuristicsRepository.getHeuristicsForRule.mockResolvedValueOnce(
          tsHeuristics,
        );

        const tsCommand: GetDetectionHeuristicsCommand = {
          userId: createUserId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        };

        const tsResult = await useCase.execute(tsCommand);

        expect(tsResult.detectionHeuristics?.language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });
    });

    describe('when querying for JavaScript', () => {
      it('returns JavaScript heuristics', async () => {
        heuristicsRepository.getHeuristicsForRule.mockResolvedValueOnce(
          jsHeuristics,
        );

        const jsCommand: GetDetectionHeuristicsCommand = {
          userId: createUserId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        };

        const jsResult = await useCase.execute(jsCommand);

        expect(jsResult.detectionHeuristics).toEqual(jsHeuristics);
      });

      it('returns JavaScript language', async () => {
        heuristicsRepository.getHeuristicsForRule.mockResolvedValueOnce(
          jsHeuristics,
        );

        const jsCommand: GetDetectionHeuristicsCommand = {
          userId: createUserId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        };

        const jsResult = await useCase.execute(jsCommand);

        expect(jsResult.detectionHeuristics?.language).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
      });
    });
  });
});
