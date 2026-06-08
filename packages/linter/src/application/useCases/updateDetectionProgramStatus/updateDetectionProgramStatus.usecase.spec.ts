import { UpdateDetectionProgramStatusUseCase } from './updateDetectionProgramStatus.usecase';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import {
  DetectionStatus,
  IStandardsPort,
  ProgrammingLanguage,
  createRuleId,
  RuleExample,
  createRuleExampleId,
  createStandardVersionId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import {
  UpdateDetectionProgramStatusCommand,
  IUpdateDetectionProgramUseCase,
  IExecuteLinterProgramsUseCase,
  ExecuteLinterProgramsCommand,
  ExecuteLinterProgramsResult,
} from '@packmind/types';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';
import {
  createDetectionProgramId,
  createOrganizationId,
} from '@packmind/types';
import { ruleFactory } from '@packmind/standards/test';
import { RuleNotFoundError } from '../../../domain/errors';

// Mock SSE event publisher
jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');
  return {
    ...actual,
    SSEEventPublisher: {
      publishProgramStatusEvent: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('UpdateDetectionProgramStatusUseCase', () => {
  let useCase: UpdateDetectionProgramStatusUseCase;
  let repositories: jest.Mocked<ILinterRepositories>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let executeLinterProgramsUseCase: jest.Mocked<IExecuteLinterProgramsUseCase>;
  let updateDetectionProgramUseCase: jest.Mocked<IUpdateDetectionProgramUseCase>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  const ruleId = createRuleId(uuidv4());
  const standardVersionId = createStandardVersionId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());

  const mockRule = ruleFactory({
    id: ruleId,
    content: 'Use const instead of var',
    standardVersionId,
  });

  const createMockExample = (
    positive: string,
    negative: string,
  ): RuleExample => ({
    id: createRuleExampleId(uuidv4()),
    lang: ProgrammingLanguage.JAVASCRIPT,
    positive,
    negative,
    ruleId,
  });

  beforeEach(() => {
    activeDetectionProgramRepository = {
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      findById: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      updateActiveDetectionProgram: jest.fn(),
      deleteByRuleId: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    detectionProgramRepository = {
      findById: jest.fn(),
      add: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleIdAndLanguage: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      getLatestVersionByRuleId: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    repositories = {
      getActiveDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(activeDetectionProgramRepository),
      getDetectionProgramRepository: jest
        .fn()
        .mockReturnValue(detectionProgramRepository),
      getDetectionProgramMetadataRepository: jest.fn(),
      getRuleDetectionHeuristicsRepository: jest.fn(),
    } as unknown as jest.Mocked<ILinterRepositories>;

    standardsAdapter = {
      getRule: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandard: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      findStandardBySlug: jest.fn(),
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    executeLinterProgramsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<IExecuteLinterProgramsUseCase>;

    updateDetectionProgramUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<IUpdateDetectionProgramUseCase>;

    stubbedLogger = stubLogger();

    useCase = new UpdateDetectionProgramStatusUseCase(
      repositories,
      standardsAdapter,
      executeLinterProgramsUseCase,
      stubbedLogger,
    );

    // Default mocks
    standardsAdapter.getRule.mockResolvedValue(mockRule);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when both programs pass validation', () => {
      const activeProgramId = createDetectionProgramId(uuidv4());
      const draftProgramId = createDetectionProgramId(uuidv4());

      beforeEach(async () => {
        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: draftProgramId,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.TO_REVIEW,
          sourceCodeState: 'AST',
        });

        const draftProgram = detectionProgramFactory({
          id: draftProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.TO_REVIEW,
          sourceCodeState: 'RAW',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById
          .mockResolvedValueOnce(activeProgram)
          .mockResolvedValueOnce(draftProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        // Negative examples return violations (good)
        // Positive examples return no violations (good)
        executeLinterProgramsUseCase.execute.mockImplementation(
          async (cmd: ExecuteLinterProgramsCommand) => {
            const isNegative = cmd.filePath === 'validation-negative-example';
            return {
              file: cmd.filePath,
              violations: isNegative
                ? [{ line: 1, character: 0, rule: 'test', standard: 'test' }]
                : [],
            } as ExecuteLinterProgramsResult;
          },
        );

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);
      });

      it('updates active program status to READY', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          activeProgramId,
          DetectionStatus.READY,
        );
      });

      it('updates draft program status to READY', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          draftProgramId,
          DetectionStatus.READY,
        );
      });
    });

    describe('when active program fails negative example validation', () => {
      it('updates active program status to TO_REVIEW', async () => {
        const activeProgramId = createDetectionProgramId(uuidv4());

        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: null,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'AST',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById.mockResolvedValue(activeProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        // Negative example returns NO violations (bad - should have violations)
        executeLinterProgramsUseCase.execute.mockResolvedValue({
          file: 'validation-negative-example',
          violations: [],
        });

        detectionProgramRepository.updateStatus.mockResolvedValue(undefined);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);

        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          activeProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });
    });

    describe('when active program fails positive example validation', () => {
      it('updates active program status to TO_REVIEW', async () => {
        const activeProgramId = createDetectionProgramId(uuidv4());

        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: null,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'RAW',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById.mockResolvedValue(activeProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        // First call (negative) returns violations (good)
        // Second call (positive) returns violations (bad - should have none)
        executeLinterProgramsUseCase.execute
          .mockResolvedValueOnce({
            file: 'validation-negative-example',
            violations: [
              { line: 1, character: 0, rule: 'test', standard: 'test' },
            ],
          })
          .mockResolvedValueOnce({
            file: 'validation-positive-example',
            violations: [
              { line: 1, character: 0, rule: 'test', standard: 'test' },
            ],
          });

        detectionProgramRepository.updateStatus.mockResolvedValue(undefined);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);

        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          activeProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });
    });

    describe('when draft program fails validation independently', () => {
      const activeProgramId = createDetectionProgramId(uuidv4());
      const draftProgramId = createDetectionProgramId(uuidv4());

      beforeEach(async () => {
        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: draftProgramId,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'AST',
        });

        const draftProgram = detectionProgramFactory({
          id: draftProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'RAW',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById
          .mockResolvedValueOnce(activeProgram)
          .mockResolvedValueOnce(draftProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        let callCount = 0;
        executeLinterProgramsUseCase.execute.mockImplementation(async () => {
          callCount++;
          // First 2 calls are for active program (pass)
          if (callCount <= 2) {
            return {
              file:
                callCount === 1
                  ? 'validation-negative-example'
                  : 'validation-positive-example',
              violations:
                callCount === 1
                  ? [{ line: 1, character: 0, rule: 'test', standard: 'test' }]
                  : [],
            } as ExecuteLinterProgramsResult;
          }
          // Third call is for draft program negative (fail)
          return {
            file: 'validation-negative-example',
            violations: [],
          } as ExecuteLinterProgramsResult;
        });

        updateDetectionProgramUseCase.execute.mockResolvedValue({
          ...draftProgram,
          status: DetectionStatus.TO_REVIEW,
        });

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);
      });

      it('calls updateStatus twice', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledTimes(
          2,
        );
      });

      it('updates active program status to READY', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          activeProgramId,
          DetectionStatus.READY,
        );
      });

      it('updates draft program status to TO_REVIEW', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          draftProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });
    });

    describe('when both programs fail validation', () => {
      const activeProgramId = createDetectionProgramId(uuidv4());
      const draftProgramId = createDetectionProgramId(uuidv4());

      beforeEach(async () => {
        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: draftProgramId,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'AST',
        });

        const draftProgram = detectionProgramFactory({
          id: draftProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'RAW',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById
          .mockResolvedValueOnce(activeProgram)
          .mockResolvedValueOnce(draftProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        // Both programs fail negative validation (no violations found)
        executeLinterProgramsUseCase.execute.mockResolvedValue({
          file: 'validation-negative-example',
          violations: [],
        });

        detectionProgramRepository.updateStatus.mockResolvedValue(undefined);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);
      });

      it('calls updateStatus twice', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledTimes(
          2,
        );
      });

      it('updates active program status to TO_REVIEW', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          activeProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });

      it('updates draft program status to TO_REVIEW', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          draftProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });
    });

    describe('when program has sourceCodeState NONE', () => {
      beforeEach(async () => {
        const activeProgramId = createDetectionProgramId(uuidv4());

        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: null,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'NONE',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById.mockResolvedValue(activeProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);
      });

      it('does not execute linter programs', () => {
        expect(executeLinterProgramsUseCase.execute).not.toHaveBeenCalled();
      });

      it('does not add detection program', () => {
        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when no examples exist for language', () => {
      const activeProgramId = createDetectionProgramId(uuidv4());
      const draftProgramId = createDetectionProgramId(uuidv4());

      beforeEach(async () => {
        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: draftProgramId,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'AST',
        });

        const draftProgram = detectionProgramFactory({
          id: draftProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'RAW',
        });

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById
          .mockResolvedValueOnce(activeProgram)
          .mockResolvedValueOnce(draftProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue([]);

        detectionProgramRepository.updateStatus.mockResolvedValue(undefined);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);
      });

      it('calls updateStatus twice', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledTimes(
          2,
        );
      });

      it('updates active program status to TO_REVIEW', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          activeProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });

      it('updates draft program status to TO_REVIEW', () => {
        expect(detectionProgramRepository.updateStatus).toHaveBeenCalledWith(
          draftProgramId,
          DetectionStatus.TO_REVIEW,
        );
      });

      it('does not execute linter programs', () => {
        expect(executeLinterProgramsUseCase.execute).not.toHaveBeenCalled();
      });
    });

    describe('when active detection program is not found', () => {
      beforeEach(() => {
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
      });

      it('resolves without error', async () => {
        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await expect(useCase.execute(command)).resolves.not.toThrow();
      });

      it('does not update detection program status', async () => {
        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await useCase.execute(command);

        expect(detectionProgramRepository.updateStatus).not.toHaveBeenCalled();
      });
    });

    describe('when rule is not found', () => {
      it('throws an error', async () => {
        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        standardsAdapter.getRule.mockResolvedValue(null);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          RuleNotFoundError,
        );
      });
    });

    describe('when execution throws an error', () => {
      it('propagates the error', async () => {
        const activeProgramId = createDetectionProgramId(uuidv4());

        const activeDetectionProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgramId,
          detectionProgramDraftVersion: null,
        });

        const activeProgram = detectionProgramFactory({
          id: activeProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          status: DetectionStatus.READY,
          sourceCodeState: 'AST',
        });

        const examples = [createMockExample('const x = 1;', 'var x = 1;')];

        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          activeDetectionProgram,
        );
        detectionProgramRepository.findById.mockResolvedValue(activeProgram);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(examples);

        const executionError = new Error('Execution failed');
        executeLinterProgramsUseCase.execute.mockRejectedValue(executionError);

        const command: UpdateDetectionProgramStatusCommand = {
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId: organizationId as unknown as string,
          userId: organizationId as unknown as string,
        };

        await expect(useCase.execute(command)).rejects.toThrow(
          'Execution failed',
        );
      });
    });
  });
});
