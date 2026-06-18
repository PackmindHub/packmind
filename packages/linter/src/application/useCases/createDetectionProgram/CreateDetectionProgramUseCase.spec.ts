import { CreateDetectionProgramUseCase } from './CreateDetectionProgramUseCase';
import { IDetectionProgramRepository } from '../../../domain/repositories/IDetectionProgramRepository';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createUserId,
  ILinterAstPort,
} from '@packmind/types';
import {
  createRuleId,
  createStandardId,
  createStandardVersionId,
  ProgrammingLanguage,
  Rule,
  Standard,
  StandardVersion,
  createDetectionProgramId,
  DetectionProgram,
  DetectionModeEnum,
  IStandardsPort,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
  CreateDetectionProgramCommand,
} from '@packmind/types';
import { ruleFactory } from '@packmind/standards/test';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { stubLogger } from '@packmind/test-utils';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';
import { standardFactory } from '@packmind/standards/test';

// Mock clearConsoleLogFromProgramOutput
const mockClearConsoleLog = jest.fn();
jest.mock(
  '../generateProgramUseCase/shared/program/ProgramExecutionUtils',
  () => ({
    clearConsoleLogFromProgramOutput: (...args: unknown[]) =>
      mockClearConsoleLog(...args),
  }),
);

// Add at the top, before other imports
jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');
  return {
    ...actual,
    SSEEventPublisher: {
      publishProgramStatusEvent: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('CreateDetectionProgramUseCase', () => {
  let createDetectionProgramUseCase: CreateDetectionProgramUseCase;
  let detectionProgramRepository: jest.Mocked<IDetectionProgramRepository>;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let linterAstPort: jest.Mocked<ILinterAstPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Reset mock to return the code as-is by default
    mockClearConsoleLog.mockImplementation(async (code: string) => code);
    // Mock DetectionProgramRepository
    detectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndVersion: jest.fn(),
      getLatestVersionByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IDetectionProgramRepository>;

    // Mock ActiveDetectionProgramRepository
    activeDetectionProgramRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      deleteByRuleId: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    standardsAdapter = {
      getStandard: jest.fn(),
      getRule: jest.fn(),
      getStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
      listStandardVersions: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      getRulesByStandardId: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getRuleCodeExamples: jest.fn(),
      findStandardBySlug: jest.fn(),
      getLatestStandardVersion: jest.fn(),
    };

    linterAstPort = {
      removeConsoleStatements: jest.fn(),
      getAvailableLanguages: jest.fn(),
    } as unknown as jest.Mocked<ILinterAstPort>;

    stubbedLogger = stubLogger();

    const detectionProgramService = {
      findActiveByRuleIdAndLanguage:
        activeDetectionProgramRepository.findByRuleIdAndLanguage,
      addDetectionProgram: detectionProgramRepository.add,
      addActiveDetectionProgram: activeDetectionProgramRepository.add,
    } as unknown as DetectionProgramService;

    createDetectionProgramUseCase = new CreateDetectionProgramUseCase(
      detectionProgramService,
      standardsAdapter,
      linterAstPort,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when detection program creation succeeds', () => {
      let command: CreateDetectionProgramCommand;
      let existingRule: Rule;
      let existingStandardVersion: StandardVersion;
      let existingStandard: Standard;
      let createdDetectionProgram: DetectionProgram;
      let createdActiveDetectionProgram: ActiveDetectionProgram;
      let result: DetectionProgram;

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        command = {
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
        };

        existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        createdActiveDetectionProgram = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          detectionProgramVersion: createdDetectionProgram.id,
          ruleId,
          language: command.language,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          createdActiveDetectionProgram,
        );

        result = await createDetectionProgramUseCase.execute(command);
      });

      it('fetches the rule by id', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(command.ruleId);
      });

      it('fetches the standard version for the rule', () => {
        expect(standardsAdapter.getStandardVersion).toHaveBeenCalledWith(
          existingRule.standardVersionId,
        );
      });

      it('fetches the standard for the standard version', () => {
        expect(standardsAdapter.getStandard).toHaveBeenCalledWith(
          existingStandardVersion.standardId,
        );
      });

      it('creates detection program with version 1', () => {
        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            ruleId: command.ruleId,
            code: command.code,
            version: 1,
            mode: command.mode,
          }),
        );
      });

      it('creates active detection program pointing to created detection program', () => {
        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId: command.ruleId,
            language: command.language,
            detectionProgramDraftVersion: null,
          }),
        );
      });

      it('creates detection program before active detection program', () => {
        const detectionProgramCall =
          detectionProgramRepository.add.mock.invocationCallOrder[0];
        const activeDetectionProgramCall =
          activeDetectionProgramRepository.add.mock.invocationCallOrder[0];
        expect(detectionProgramCall).toBeLessThan(activeDetectionProgramCall);
      });

      it('returns the created detection program', () => {
        expect(result).toEqual(createdDetectionProgram);
      });

      it('cleans console.log statements from the code before saving', () => {
        expect(mockClearConsoleLog).toHaveBeenCalledWith(
          command.code,
          linterAstPort,
        );
      });
    });

    describe('when clearConsoleLogFromProgramOutput cleans the code', () => {
      it('saves the cleaned code to the database', async () => {
        const codeWithConsoleLog =
          'console.log("debug"); if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }';
        const cleanedCode =
          'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }';

        mockClearConsoleLog.mockResolvedValue(cleanedCode);

        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: codeWithConsoleLog,
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: cleanedCode,
          version: 1,
          mode: command.mode,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId,
            language: command.language,
          }),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            code: cleanedCode,
          }),
        );
      });
    });

    describe('when rule does not exist', () => {
      let command: CreateDetectionProgramCommand;

      beforeEach(() => {
        const organizationId = createOrganizationId(uuidv4());
        command = {
          ruleId: createRuleId(uuidv4()),
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        standardsAdapter.getRule.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Rule not found');
      });

      it('does not create detection program', async () => {
        try {
          await createDetectionProgramUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(detectionProgramRepository.add).not.toHaveBeenCalled();
      });

      it('does not create active detection program', async () => {
        try {
          await createDetectionProgramUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when rule does not belong to user organization', () => {
      describe('when standard version is not found', () => {
        let command: CreateDetectionProgramCommand;

        beforeEach(() => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const standardVersionId = createStandardVersionId(uuidv4());

          command = {
            ruleId,
            code: 'test code',
            language: ProgrammingLanguage.JAVASCRIPT,
            mode: DetectionModeEnum.REGEXP,
            userId: createUserId(uuidv4()),
            organizationId,
          };

          const existingRule = ruleFactory({
            id: ruleId,
            standardVersionId,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getStandardVersion.mockResolvedValue(null);
        });

        it('throws an error', async () => {
          await expect(
            createDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Standard version not found for rule');
        });

        it('does not create detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });

        it('does not create active detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });

      describe('when standard is not found', () => {
        let command: CreateDetectionProgramCommand;

        beforeEach(() => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const standardVersionId = createStandardVersionId(uuidv4());
          const standardId = createStandardId(uuidv4());

          command = {
            ruleId,
            code: 'test code',
            language: ProgrammingLanguage.JAVASCRIPT,
            mode: DetectionModeEnum.REGEXP,
            userId: createUserId(uuidv4()),
            organizationId,
          };

          const existingRule = ruleFactory({
            id: ruleId,
            standardVersionId,
          });

          const existingStandardVersion = {
            id: standardVersionId,
            standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            description: 'Test Description',
            version: 1,
            scope: null,
          };

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getStandardVersion.mockResolvedValue(
            existingStandardVersion,
          );
          standardsAdapter.getStandard.mockResolvedValue(null);
        });

        it('throws an error', async () => {
          await expect(
            createDetectionProgramUseCase.execute(command),
          ).rejects.toThrow('Standard not found for rule');
        });

        it('does not create detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });

        it('does not create active detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });

      // Note: Organization-level validation was removed as standards are now space-scoped
      // and validation should be done at a higher level (e.g., API layer)
    });

    describe('when existing active detection program exists for same rule and language', () => {
      describe('when trying to overwrite existing detection program', () => {
        let command: CreateDetectionProgramCommand;
        let ruleId: ReturnType<typeof createRuleId>;

        beforeEach(() => {
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());
          ruleId = createRuleId(uuidv4());

          command = {
            ruleId,
            code: 'new detection code',
            language: ProgrammingLanguage.JAVASCRIPT,
            mode: DetectionModeEnum.SINGLE_AST,
            userId,
            organizationId,
          };

          const standardVersionId = createStandardVersionId(uuidv4());
          const standardId = createStandardId(uuidv4());

          const existingRule = ruleFactory({
            id: ruleId,
            standardVersionId,
          });

          const existingStandardVersion = {
            id: standardVersionId,
            standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            description: 'Test Description',
            version: 1,
            scope: null,
          };

          const existingStandard = standardFactory({
            id: standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            userId,
            scope: null,
          });

          const existingActiveProgram = activeDetectionProgramFactory({
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getStandardVersion.mockResolvedValue(
            existingStandardVersion,
          );
          standardsAdapter.getStandard.mockResolvedValue(existingStandard);
          activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
            existingActiveProgram,
          );
        });

        it('throws an error', async () => {
          await expect(
            createDetectionProgramUseCase.execute(command),
          ).rejects.toThrow(
            'Active detection program already exists for this rule and language',
          );
        });

        it('checks for existing active program by rule id and language', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(
            activeDetectionProgramRepository.findByRuleIdAndLanguage,
          ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.JAVASCRIPT);
        });

        it('does not create detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });

        it('does not create active detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });

      describe('when creating detection program for different language on same rule', () => {
        let command: CreateDetectionProgramCommand;
        let ruleId: ReturnType<typeof createRuleId>;
        let createdDetectionProgram: DetectionProgram;
        let result: DetectionProgram;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          const userId = createUserId(uuidv4());
          ruleId = createRuleId(uuidv4());

          command = {
            ruleId,
            code: 'typescript detection code',
            language: ProgrammingLanguage.TYPESCRIPT,
            mode: DetectionModeEnum.SINGLE_AST,
            userId,
            organizationId,
          };

          const standardVersionId = createStandardVersionId(uuidv4());
          const standardId = createStandardId(uuidv4());

          const existingRule = ruleFactory({
            id: ruleId,
            standardVersionId,
          });

          const existingStandardVersion = {
            id: standardVersionId,
            standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            description: 'Test Description',
            version: 1,
            scope: null,
          };

          const existingStandard = standardFactory({
            id: standardId,
            name: 'Test Standard',
            slug: 'test-standard',
            userId,
            scope: null,
          });

          createdDetectionProgram = detectionProgramFactory({
            ruleId,
            code: command.code,
            version: 1,
            mode: command.mode,
          });

          const createdActiveProgram = activeDetectionProgramFactory({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getStandardVersion.mockResolvedValue(
            existingStandardVersion,
          );
          standardsAdapter.getStandard.mockResolvedValue(existingStandard);
          activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
            null,
          );
          detectionProgramRepository.add.mockResolvedValue(
            createdDetectionProgram,
          );
          activeDetectionProgramRepository.add.mockResolvedValue(
            createdActiveProgram,
          );

          result = await createDetectionProgramUseCase.execute(command);
        });

        it('checks for existing active program by rule id and language', () => {
          expect(
            activeDetectionProgramRepository.findByRuleIdAndLanguage,
          ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.TYPESCRIPT);
        });

        it('creates detection program with correct data', () => {
          expect(detectionProgramRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              ruleId,
              code: command.code,
              version: 1,
              mode: command.mode,
            }),
          );
        });

        it('creates active detection program with correct data', () => {
          expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
            expect.objectContaining({
              detectionProgramVersion: createdDetectionProgram.id,
              ruleId,
              language: ProgrammingLanguage.TYPESCRIPT,
            }),
          );
        });

        it('returns the created detection program', () => {
          expect(result).toEqual(createdDetectionProgram);
        });
      });
    });

    describe('with different detection program modes', () => {
      it('creates detection program with REGEXP mode', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: '/Controller$/.test(className)',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          mode: DetectionModeEnum.REGEXP,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: DetectionModeEnum.REGEXP,
          }),
        );
      });

      it('creates detection program with FILE_SYSTEM mode', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'const files = fs.readdirSync(directory);',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.FILE_SYSTEM,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          mode: DetectionModeEnum.FILE_SYSTEM,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(detectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: DetectionModeEnum.FILE_SYSTEM,
          }),
        );
      });
    });

    describe('with different programming languages', () => {
      it('creates detection program for TypeScript', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'interface validation code',
          language: ProgrammingLanguage.TYPESCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          detectionProgramFactory(),
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            language: ProgrammingLanguage.TYPESCRIPT,
          }),
        );
      });

      it('creates detection program for Python', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'def validate_naming(node):',
          language: ProgrammingLanguage.PYTHON,
          mode: DetectionModeEnum.SINGLE_AST,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          detectionProgramFactory(),
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            language: ProgrammingLanguage.PYTHON,
          }),
        );
      });
    });

    describe('when detection program creation fails', () => {
      let command: CreateDetectionProgramCommand;

      beforeEach(() => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        command = {
          ruleId,
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockRejectedValue(
          new Error('Database connection failed'),
        );
      });

      it('throws an error', async () => {
        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');
      });

      it('does not create active detection program', async () => {
        try {
          await createDetectionProgramUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(activeDetectionProgramRepository.add).not.toHaveBeenCalled();
      });
    });

    describe('when active detection program creation fails', () => {
      let command: CreateDetectionProgramCommand;

      beforeEach(() => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        command = {
          ruleId,
          code: 'test code',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.REGEXP,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory();

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockRejectedValue(
          new Error('Active program creation failed'),
        );
      });

      it('throws an error', async () => {
        await expect(
          createDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Active program creation failed');
      });

      it('attempts to create detection program before failing', async () => {
        try {
          await createDetectionProgramUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(detectionProgramRepository.add).toHaveBeenCalledTimes(1);
      });

      it('attempts to create active detection program', async () => {
        try {
          await createDetectionProgramUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledTimes(1);
      });
    });

    describe('when mustBeDraftVersion is true', () => {
      it('creates active detection program with draft version', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
          mustBeDraftVersion: true,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: null,
            ruleId: command.ruleId,
            language: command.language,
            detectionProgramDraftVersion: createdDetectionProgram.id,
          }),
        );
      });
    });

    describe('when mustBeDraftVersion is false', () => {
      it('creates active detection program with regular version (current behavior)', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardVersionId = createStandardVersionId(uuidv4());
        const standardId = createStandardId(uuidv4());

        const command: CreateDetectionProgramCommand = {
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          language: ProgrammingLanguage.JAVASCRIPT,
          mode: DetectionModeEnum.SINGLE_AST,
          userId,
          organizationId,
          mustBeDraftVersion: false,
        };

        const existingRule = ruleFactory({
          id: ruleId,
          standardVersionId,
        });

        const existingStandardVersion = {
          id: standardVersionId,
          standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test Description',
          version: 1,
          scope: null,
        };

        const existingStandard = standardFactory({
          id: standardId,
          name: 'Test Standard',
          slug: 'test-standard',
          userId,
          scope: null,
        });

        const createdDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: command.code,
          version: 1,
          mode: command.mode,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getStandardVersion.mockResolvedValue(
          existingStandardVersion,
        );
        standardsAdapter.getStandard.mockResolvedValue(existingStandard);
        activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
          null,
        );
        detectionProgramRepository.add.mockResolvedValue(
          createdDetectionProgram,
        );
        activeDetectionProgramRepository.add.mockResolvedValue(
          activeDetectionProgramFactory(),
        );

        await createDetectionProgramUseCase.execute(command);

        expect(activeDetectionProgramRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            detectionProgramVersion: createdDetectionProgram.id,
            ruleId: command.ruleId,
            language: command.language,
            detectionProgramDraftVersion: null,
          }),
        );
      });
    });

    describe('command validation', () => {
      describe('when code is missing', () => {
        let commandWithoutCode: CreateDetectionProgramCommand;

        beforeEach(() => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());

          commandWithoutCode = {
            ruleId,
            code: '',
            language: ProgrammingLanguage.JAVASCRIPT,
            mode: DetectionModeEnum.REGEXP,
            organizationId,
            userId: createUserId(uuidv4()),
          } as CreateDetectionProgramCommand;
        });

        it('throws an error', async () => {
          await expect(
            createDetectionProgramUseCase.execute(commandWithoutCode),
          ).rejects.toThrow('Code is required');
        });

        it('does not create detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(commandWithoutCode);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });

      describe('when language is missing', () => {
        let commandWithoutLanguage: CreateDetectionProgramCommand;

        beforeEach(() => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());

          commandWithoutLanguage = {
            ruleId,
            code: 'test code',
            language: null,
            mode: DetectionModeEnum.REGEXP,
            organizationId,
            userId: createUserId(uuidv4()),
          } as unknown as CreateDetectionProgramCommand;
        });

        it('throws an error', async () => {
          await expect(
            createDetectionProgramUseCase.execute(commandWithoutLanguage),
          ).rejects.toThrow('Language is required');
        });

        it('does not create detection program', async () => {
          try {
            await createDetectionProgramUseCase.execute(commandWithoutLanguage);
          } catch {
            // Expected to throw
          }

          expect(detectionProgramRepository.add).not.toHaveBeenCalled();
        });
      });
    });
  });
});
