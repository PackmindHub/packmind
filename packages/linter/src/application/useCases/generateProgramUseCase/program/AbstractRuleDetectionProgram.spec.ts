import AbstractRuleDetectionProgram from './AbstractRuleDetectionProgram';
import { ProgramGenerationResult } from '../generation/Types';
import {
  DetectionProgramRuleInput,
  ProgrammingLanguage,
  createRuleId,
  Rule,
} from '@packmind/types';
import { AIService } from '@packmind/node-utils';
import DetectionToolingLogWriter from '../log/DetectionToolingLogWriter';
import { stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { v4 as uuidv4 } from 'uuid';

// Concrete implementation for testing purposes
class TestableRuleDetectionProgram extends AbstractRuleDetectionProgram {
  async testProgramAndIterateWithAgent(): Promise<ProgramGenerationResult> {
    return {
      program: 'test program',
      results: [],
      sourceCodeState: 'RAW',
    };
  }

  async getFinalAnalysisResults(): Promise<[]> {
    return [];
  }
}

describe('AbstractRuleDetectionProgram', () => {
  let program: TestableRuleDetectionProgram;
  let mockAiService: jest.Mocked<AIService>;
  let mockLogsWriter: jest.Mocked<DetectionToolingLogWriter>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    mockAiService = {
      executePromptWithHistory: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    mockLogsWriter = {
      addLogsMessage: jest.fn(),
      updateDetectionHeuristics: jest.fn(),
    } as unknown as jest.Mocked<DetectionToolingLogWriter>;

    stubbedLogger = stubLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldGenerateHeuristics', () => {
    describe('when heuristics is undefined', () => {
      beforeEach(() => {
        const detectionProgramRuleInput: DetectionProgramRuleInput = {
          rule: {
            id: createRuleId(uuidv4()),
            content: 'Test rule',
          } as Rule,
          ruleExamples: [],
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: undefined,
        };

        program = new TestableRuleDetectionProgram(
          detectionProgramRuleInput,
          mockAiService,
          mockLogsWriter,
          null,
          stubbedLogger,
        );
      });

      it('returns true', () => {
        const result = program.shouldGenerateHeuristics();

        expect(result).toBe(true);
      });
    });

    describe('when heuristics is null', () => {
      beforeEach(() => {
        const detectionProgramRuleInput: DetectionProgramRuleInput = {
          rule: {
            id: createRuleId(uuidv4()),
            content: 'Test rule',
          } as Rule,
          ruleExamples: [],
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: null as unknown as undefined,
        };

        program = new TestableRuleDetectionProgram(
          detectionProgramRuleInput,
          mockAiService,
          mockLogsWriter,
          null,
          stubbedLogger,
        );
      });

      it('returns true', () => {
        const result = program.shouldGenerateHeuristics();

        expect(result).toBe(true);
      });
    });

    describe('when heuristics is an empty array', () => {
      beforeEach(() => {
        const detectionProgramRuleInput: DetectionProgramRuleInput = {
          rule: {
            id: createRuleId(uuidv4()),
            content: 'Test rule',
          } as Rule,
          ruleExamples: [],
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: [],
        };

        program = new TestableRuleDetectionProgram(
          detectionProgramRuleInput,
          mockAiService,
          mockLogsWriter,
          null,
          stubbedLogger,
        );
      });

      it('returns true', () => {
        const result = program.shouldGenerateHeuristics();

        expect(result).toBe(true);
      });
    });

    describe('when heuristics has content', () => {
      beforeEach(() => {
        const detectionProgramRuleInput: DetectionProgramRuleInput = {
          rule: {
            id: createRuleId(uuidv4()),
            content: 'Test rule',
          } as Rule,
          ruleExamples: [],
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: ['Check for pattern X', 'Verify condition Y'],
        };

        program = new TestableRuleDetectionProgram(
          detectionProgramRuleInput,
          mockAiService,
          mockLogsWriter,
          null,
          stubbedLogger,
        );
      });

      it('returns false', () => {
        const result = program.shouldGenerateHeuristics();

        expect(result).toBe(false);
      });
    });

    describe('when heuristics has single item', () => {
      beforeEach(() => {
        const detectionProgramRuleInput: DetectionProgramRuleInput = {
          rule: {
            id: createRuleId(uuidv4()),
            content: 'Test rule',
          } as Rule,
          ruleExamples: [],
          language: ProgrammingLanguage.TYPESCRIPT,
          heuristics: ['Single heuristic'],
        };

        program = new TestableRuleDetectionProgram(
          detectionProgramRuleInput,
          mockAiService,
          mockLogsWriter,
          null,
          stubbedLogger,
        );
      });

      it('returns false', () => {
        const result = program.shouldGenerateHeuristics();

        expect(result).toBe(false);
      });
    });
  });
});
