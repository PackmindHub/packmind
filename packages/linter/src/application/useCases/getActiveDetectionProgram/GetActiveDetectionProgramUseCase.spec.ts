import { GetActiveDetectionProgramUseCase } from './GetActiveDetectionProgramUseCase';
import { IActiveDetectionProgramRepository } from '../../../domain/repositories/IActiveDetectionProgramRepository';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { ruleFactory } from '@packmind/standards/test';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  IStandardsPort,
  ProgrammingLanguage,
  Rule,
  RuleExample,
  createRuleExampleId,
  ActiveDetectionProgram,
  createActiveDetectionProgramId,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import {
  createDetectionProgramId,
  DetectionProgram,
  DetectionModeEnum,
} from '@packmind/types';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';
import {
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramResponse,
} from '@packmind/types';

const buildActiveProgramWithRelations = (
  activeProgram: ActiveDetectionProgram,
  detectionProgram: DetectionProgram,
  draftDetectionProgram: DetectionProgram | null = null,
) => ({
  ...activeProgram,
  detectionProgram,
  draftDetectionProgram,
});

describe('GetActiveDetectionProgramUseCase', () => {
  let getActiveDetectionProgramUseCase: GetActiveDetectionProgramUseCase;
  let activeDetectionProgramRepository: jest.Mocked<IActiveDetectionProgramRepository>;
  let detectionProgramService: jest.Mocked<DetectionProgramService>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock ActiveDetectionProgramRepository
    activeDetectionProgramRepository = {
      add: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      findByRuleIdAndLanguage: jest.fn(),
      findByRuleIdWithPrograms: jest.fn(),
      deleteByRuleId: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<IActiveDetectionProgramRepository>;

    standardsAdapter = {
      getRule: jest.fn(),
      getStandard: jest.fn(),
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
    standardsAdapter.getRuleCodeExamples.mockResolvedValue([]);

    stubbedLogger = stubLogger();

    // Build a mocked DetectionProgramService to satisfy constructor
    detectionProgramService = {
      findActiveByRuleIdAndLanguage:
        activeDetectionProgramRepository.findByRuleIdAndLanguage,
      findActiveByRuleIdWithPrograms:
        activeDetectionProgramRepository.findByRuleIdWithPrograms,
    } as unknown as jest.Mocked<DetectionProgramService>;

    getActiveDetectionProgramUseCase = new GetActiveDetectionProgramUseCase(
      detectionProgramService,
      standardsAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when active detection program exists', () => {
      let command: GetActiveDetectionProgramCommand;
      let existingRule: Rule;
      let activeProgram: ActiveDetectionProgram;
      let detectionProgram: DetectionProgram;
      let draftDetectionProgram: DetectionProgram;
      let result: GetActiveDetectionProgramResponse;

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const detectionProgramId = createDetectionProgramId(uuidv4());

        command = {
          ruleId,
          organizationId,
          userId,
        };

        existingRule = ruleFactory({
          id: ruleId,
        });

        detectionProgram = detectionProgramFactory({
          id: detectionProgramId,
          ruleId,
          code: 'if (ast.node.type === "ClassDeclaration") { return { line: ast.node.loc.start.line }; }',
          version: 3,
          mode: DetectionModeEnum.SINGLE_AST,
        });

        draftDetectionProgram = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: 'draft program',
          version: 4,
          mode: DetectionModeEnum.SINGLE_AST,
        });

        activeProgram = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          detectionProgramVersion: detectionProgramId,
          detectionProgramDraftVersion: draftDetectionProgram.id,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const activeProgramWithDetectionProgram =
          buildActiveProgramWithRelations(
            activeProgram,
            detectionProgram,
            draftDetectionProgram,
          );

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [activeProgramWithDetectionProgram],
        );

        result = await getActiveDetectionProgramUseCase.execute(command);
      });

      it('validates rule exists and belongs to organization', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(command.ruleId);
      });

      it('retrieves active detection program with associated detection program data', () => {
        expect(
          activeDetectionProgramRepository.findByRuleIdWithPrograms,
        ).toHaveBeenCalledWith(command.ruleId);
      });

      it('returns active detection program with detection program data', () => {
        expect(result).toEqual({
          programs: [
            {
              id: activeProgram.id,
              detectionProgramVersion: activeProgram.detectionProgramVersion,
              ruleId: activeProgram.ruleId,
              language: activeProgram.language,
              severity: activeProgram.severity,
              detectionProgram: {
                id: detectionProgram.id,
                ruleId: detectionProgram.ruleId,
                code: detectionProgram.code,
                version: detectionProgram.version,
                mode: detectionProgram.mode,
                language: detectionProgram.language,
                status: detectionProgram.status,
                sourceCodeState: detectionProgram.sourceCodeState,
                createdAt: detectionProgram.createdAt,
              },
              detectionProgramDraftVersion:
                activeProgram.detectionProgramDraftVersion,
              draftDetectionProgram: {
                id: draftDetectionProgram.id,
                ruleId: draftDetectionProgram.ruleId,
                code: draftDetectionProgram.code,
                version: draftDetectionProgram.version,
                mode: draftDetectionProgram.mode,
                language: draftDetectionProgram.language,
                status: draftDetectionProgram.status,
                sourceCodeState: draftDetectionProgram.sourceCodeState,
                createdAt: draftDetectionProgram.createdAt,
              },
            },
          ],
        });
      });
    });

    describe('when no active detection program exists', () => {
      it('returns null', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingRule = ruleFactory({
          id: ruleId,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [],
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result).toEqual({ programs: null });
      });
    });

    describe('when rule has examples but no active detection programs', () => {
      let result: GetActiveDetectionProgramResponse;

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingRule = ruleFactory({
          id: ruleId,
        });

        const ruleExamples: RuleExample[] = [
          {
            id: createRuleExampleId('example-ts-1'),
            lang: ProgrammingLanguage.TYPESCRIPT,
            positive: 'const value = 1;',
            negative: 'const badValue = eval(input);',
            ruleId,
          },
          {
            id: createRuleExampleId('example-java-1'),
            lang: ProgrammingLanguage.JAVA,
            positive: 'public class Sample {}',
            negative: 'System.out.println(userInput);',
            ruleId,
          },
        ];

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getRuleCodeExamples.mockResolvedValue(ruleExamples);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [],
        );

        result = await getActiveDetectionProgramUseCase.execute(command);
      });

      it('returns two placeholder entries', () => {
        const programs = result.programs ?? [];

        expect(programs).toHaveLength(2);
      });

      it('includes TypeScript language', () => {
        const programs = result.programs ?? [];
        const languages = programs.map((program) => program.language);

        expect(languages).toContain(ProgrammingLanguage.TYPESCRIPT);
      });

      it('includes Java language', () => {
        const programs = result.programs ?? [];
        const languages = programs.map((program) => program.language);

        expect(languages).toContain(ProgrammingLanguage.JAVA);
      });

      it('sets detectionProgram to null for TypeScript placeholder', () => {
        const programs = result.programs ?? [];
        const typescriptProgram = programs.find(
          (program) => program.language === ProgrammingLanguage.TYPESCRIPT,
        );

        expect(typescriptProgram?.detectionProgram).toBeNull();
      });

      it('sets draftDetectionProgram to null for TypeScript placeholder', () => {
        const programs = result.programs ?? [];
        const typescriptProgram = programs.find(
          (program) => program.language === ProgrammingLanguage.TYPESCRIPT,
        );

        expect(typescriptProgram?.draftDetectionProgram).toBeNull();
      });

      it('marks TypeScript placeholder as example only', () => {
        const programs = result.programs ?? [];
        const typescriptProgram = programs.find(
          (program) => program.language === ProgrammingLanguage.TYPESCRIPT,
        );

        expect(typescriptProgram?.isExampleOnly).toBe(true);
      });
    });

    describe('when rule does not exist', () => {
      let command: GetActiveDetectionProgramCommand;

      beforeEach(() => {
        command = {
          ruleId: createRuleId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        standardsAdapter.getRule.mockResolvedValue(null);
      });

      it('throws an error', async () => {
        await expect(
          getActiveDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Rule not found');
      });

      it('does not query the repository', async () => {
        try {
          await getActiveDetectionProgramUseCase.execute(command);
        } catch {
          // Expected to throw
        }

        expect(
          activeDetectionProgramRepository.findByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('with multiple active programs for different languages', () => {
      it('returns the first active detection program found', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const detectionProgramId1 = createDetectionProgramId(uuidv4());
        const detectionProgramId2 = createDetectionProgramId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingRule = ruleFactory({
          id: ruleId,
        });

        const detectionProgram1 = detectionProgramFactory({
          id: detectionProgramId1,
          ruleId,
          mode: DetectionModeEnum.REGEXP,
        });

        const detectionProgram2 = detectionProgramFactory({
          id: detectionProgramId2,
          ruleId,
          mode: DetectionModeEnum.SINGLE_AST,
        });

        const activeProgram1 = activeDetectionProgramFactory({
          detectionProgramVersion: detectionProgramId1,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const activeProgram2 = activeDetectionProgramFactory({
          detectionProgramVersion: detectionProgramId2,
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        });

        const activeProgramsWithDetectionPrograms = [
          {
            ...activeProgram1,
            detectionProgram: detectionProgram1,
            draftDetectionProgram: null,
          },
          {
            ...activeProgram2,
            detectionProgram: detectionProgram2,
            draftDetectionProgram: null,
          },
        ];

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          activeProgramsWithDetectionPrograms,
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result).toEqual({
          programs: [
            {
              id: activeProgram1.id,
              detectionProgramVersion: activeProgram1.detectionProgramVersion,
              ruleId: activeProgram1.ruleId,
              language: activeProgram1.language,
              severity: activeProgram1.severity,
              detectionProgram: detectionProgram1,
              draftDetectionProgram: null,
              detectionProgramDraftVersion: null,
            },
            {
              id: activeProgram2.id,
              detectionProgramVersion: activeProgram2.detectionProgramVersion,
              ruleId: activeProgram2.ruleId,
              language: activeProgram2.language,
              severity: activeProgram2.severity,
              detectionProgram: detectionProgram2,
              draftDetectionProgram: null,
              detectionProgramDraftVersion: null,
            },
          ],
        });
      });
    });

    describe('with different detection program modes', () => {
      describe('when mode is REGEXP', () => {
        let result: GetActiveDetectionProgramResponse;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const detectionProgramId = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram = detectionProgramFactory({
            id: detectionProgramId,
            ruleId,
            code: '/Controller$/.test(className)',
            mode: DetectionModeEnum.REGEXP,
          });

          const activeProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId,
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeProgram,
                detectionProgram,
                draftDetectionProgram: null,
              },
            ],
          );

          result = await getActiveDetectionProgramUseCase.execute(command);
        });

        it('returns detection program with REGEXP mode', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].detectionProgram.mode).toBe(
            DetectionModeEnum.REGEXP,
          );
        });

        it('returns detection program with correct code', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].detectionProgram.code).toBe(
            '/Controller$/.test(className)',
          );
        });
      });

      describe('when mode is FILE_SYSTEM', () => {
        let result: GetActiveDetectionProgramResponse;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const detectionProgramId = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram = detectionProgramFactory({
            id: detectionProgramId,
            ruleId,
            code: 'const files = fs.readdirSync(directory);',
            mode: DetectionModeEnum.FILE_SYSTEM,
          });

          const activeProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId,
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeProgram,
                detectionProgram,
                draftDetectionProgram: null,
              },
            ],
          );

          result = await getActiveDetectionProgramUseCase.execute(command);
        });

        it('returns detection program with FILE_SYSTEM mode', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].detectionProgram.mode).toBe(
            DetectionModeEnum.FILE_SYSTEM,
          );
        });

        it('returns detection program with correct code', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].detectionProgram.code).toBe(
            'const files = fs.readdirSync(directory);',
          );
        });
      });
    });

    describe('with different programming languages', () => {
      describe('when language is TypeScript', () => {
        it('returns active program with TypeScript language', async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const detectionProgramId = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram = detectionProgramFactory({
            id: detectionProgramId,
            ruleId,
          });

          const activeProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId,
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeProgram,
                detectionProgram,
                draftDetectionProgram: null,
              },
            ],
          );

          const result =
            await getActiveDetectionProgramUseCase.execute(command);

          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];
          expect(resultArray[0].language).toBe(ProgrammingLanguage.TYPESCRIPT);
        });
      });

      describe('when language is Python', () => {
        it('returns active program with Python language', async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const detectionProgramId = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram = detectionProgramFactory({
            id: detectionProgramId,
            ruleId,
          });

          const activeProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId,
            ruleId,
            language: ProgrammingLanguage.PYTHON,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeProgram,
                detectionProgram,
                draftDetectionProgram: null,
              },
            ],
          );

          const result =
            await getActiveDetectionProgramUseCase.execute(command);

          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];
          expect(resultArray[0].language).toBe(ProgrammingLanguage.PYTHON);
        });
      });
    });

    describe('with version information', () => {
      let result: GetActiveDetectionProgramResponse;
      let detectionProgramId: ReturnType<typeof createDetectionProgramId>;

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        detectionProgramId = createDetectionProgramId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingRule = ruleFactory({
          id: ruleId,
        });

        const detectionProgram = detectionProgramFactory({
          id: detectionProgramId,
          ruleId,
          version: 5,
        });

        const activeProgram = activeDetectionProgramFactory({
          detectionProgramVersion: detectionProgramId,
          ruleId,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        result = await getActiveDetectionProgramUseCase.execute(command);
      });

      it('returns detection program with correct version', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram.version).toBe(5);
      });

      it('returns detection program with correct id', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram.id).toBe(detectionProgramId);
      });
    });

    describe('when repository query fails', () => {
      it('throws an error', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingRule = ruleFactory({
          id: ruleId,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          getActiveDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('response structure validation', () => {
      let result: GetActiveDetectionProgramResponse;
      let ruleId: ReturnType<typeof createRuleId>;
      let detectionProgramId: ReturnType<typeof createDetectionProgramId>;
      let activeProgramId: ReturnType<typeof createActiveDetectionProgramId>;

      beforeEach(async () => {
        const organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        detectionProgramId = createDetectionProgramId(uuidv4());
        activeProgramId = createActiveDetectionProgramId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingRule = ruleFactory({
          id: ruleId,
        });

        const detectionProgram = detectionProgramFactory({
          id: detectionProgramId,
          ruleId,
          code: 'test code',
          version: 1,
          mode: DetectionModeEnum.REGEXP,
        });

        const activeProgram = activeDetectionProgramFactory({
          id: activeProgramId,
          detectionProgramVersion: detectionProgramId,
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        result = await getActiveDetectionProgramUseCase.execute(command);
      });

      it('returns one program in the array', () => {
        expect(result.programs).toHaveLength(1);
      });

      it('returns active program with correct id', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0]).toHaveProperty('id', activeProgramId);
      });

      it('returns active program with correct detectionProgramVersion', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0]).toHaveProperty(
          'detectionProgramVersion',
          detectionProgramId,
        );
      });

      it('returns active program with correct ruleId', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0]).toHaveProperty('ruleId', ruleId);
      });

      it('returns active program with correct language', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0]).toHaveProperty(
          'language',
          ProgrammingLanguage.JAVASCRIPT,
        );
      });

      it('returns detection program with correct id', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram).toHaveProperty(
          'id',
          detectionProgramId,
        );
      });

      it('returns detection program with correct ruleId', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram).toHaveProperty(
          'ruleId',
          ruleId,
        );
      });

      it('returns detection program with correct code', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram).toHaveProperty(
          'code',
          'test code',
        );
      });

      it('returns detection program with correct version', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram).toHaveProperty('version', 1);
      });

      it('returns detection program with correct mode', () => {
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];

        expect(resultArray[0].detectionProgram).toHaveProperty(
          'mode',
          DetectionModeEnum.REGEXP,
        );
      });
    });

    describe('multi-language support scenarios', () => {
      describe('when language parameter is provided', () => {
        let result: GetActiveDetectionProgramResponse;
        let ruleId: ReturnType<typeof createRuleId>;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          ruleId = createRuleId(uuidv4());
          const detectionProgramId = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram = detectionProgramFactory({
            id: detectionProgramId,
            ruleId,
          });

          const typescriptActiveProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId,
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
            typescriptActiveProgram,
          );
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...typescriptActiveProgram,
                detectionProgram,
                draftDetectionProgram: null,
              },
            ],
          );

          result = await getActiveDetectionProgramUseCase.execute(command);
        });

        it('queries repository with language filter', () => {
          expect(
            activeDetectionProgramRepository.findByRuleIdAndLanguage,
          ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.TYPESCRIPT);
        });

        it('returns one program', () => {
          expect(result.programs).toHaveLength(1);
        });

        it('returns program with correct language', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].language).toBe(ProgrammingLanguage.TYPESCRIPT);
        });
      });

      describe('when no language parameter is provided', () => {
        let result: GetActiveDetectionProgramResponse;
        let ruleId: ReturnType<typeof createRuleId>;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          ruleId = createRuleId(uuidv4());
          const detectionProgramId1 = createDetectionProgramId(uuidv4());
          const detectionProgramId2 = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram1 = detectionProgramFactory({
            id: detectionProgramId1,
            ruleId,
          });

          const detectionProgram2 = detectionProgramFactory({
            id: detectionProgramId2,
            ruleId,
          });

          const javascriptActiveProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId1,
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
          });

          const typescriptActiveProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId2,
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
          });

          const activeProgramsWithDetectionPrograms = [
            {
              ...javascriptActiveProgram,
              detectionProgram: detectionProgram1,
              draftDetectionProgram: null,
            },
            {
              ...typescriptActiveProgram,
              detectionProgram: detectionProgram2,
              draftDetectionProgram: null,
            },
          ];

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            activeProgramsWithDetectionPrograms,
          );

          result = await getActiveDetectionProgramUseCase.execute(command);
        });

        it('queries repository with rule id only', () => {
          expect(
            activeDetectionProgramRepository.findByRuleIdWithPrograms,
          ).toHaveBeenCalledWith(ruleId);
        });

        it('does not query by language', () => {
          expect(
            activeDetectionProgramRepository.findByRuleIdAndLanguage,
          ).not.toHaveBeenCalled();
        });

        it('returns two programs', () => {
          expect(result.programs).toHaveLength(2);
        });

        it('returns JavaScript program first', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].language).toBe(ProgrammingLanguage.JAVASCRIPT);
        });

        it('returns TypeScript program second', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[1].language).toBe(ProgrammingLanguage.TYPESCRIPT);
        });
      });

      describe('when specific language has no active program', () => {
        let result: GetActiveDetectionProgramResponse;
        let ruleId: ReturnType<typeof createRuleId>;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          ruleId = createRuleId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            language: ProgrammingLanguage.PYTHON,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdAndLanguage.mockResolvedValue(
            null,
          );

          result = await getActiveDetectionProgramUseCase.execute(command);
        });

        it('queries repository with Python language', () => {
          expect(
            activeDetectionProgramRepository.findByRuleIdAndLanguage,
          ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.PYTHON);
        });

        it('returns null programs', () => {
          expect(result).toEqual({ programs: null });
        });
      });

      describe('when multiple languages have different detection program versions', () => {
        let result: GetActiveDetectionProgramResponse;

        beforeEach(async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const detectionProgramId1 = createDetectionProgramId(uuidv4());
          const detectionProgramId2 = createDetectionProgramId(uuidv4());

          const command: GetActiveDetectionProgramCommand = {
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingRule = ruleFactory({
            id: ruleId,
          });

          const detectionProgram1 = detectionProgramFactory({
            id: detectionProgramId1,
            ruleId,
            version: 1,
            mode: DetectionModeEnum.REGEXP,
          });

          const detectionProgram2 = detectionProgramFactory({
            id: detectionProgramId2,
            ruleId,
            version: 3,
            mode: DetectionModeEnum.SINGLE_AST,
          });

          const javascriptActiveProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId1,
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
          });

          const pythonActiveProgram = activeDetectionProgramFactory({
            detectionProgramVersion: detectionProgramId2,
            ruleId,
            language: ProgrammingLanguage.PYTHON,
          });

          const activeProgramsWithDetectionPrograms = [
            {
              ...javascriptActiveProgram,
              detectionProgram: detectionProgram1,
              draftDetectionProgram: null,
            },
            {
              ...pythonActiveProgram,
              detectionProgram: detectionProgram2,
              draftDetectionProgram: null,
            },
          ];

          standardsAdapter.getRule.mockResolvedValue(existingRule);
          activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
            activeProgramsWithDetectionPrograms,
          );

          result = await getActiveDetectionProgramUseCase.execute(command);
        });

        it('returns two programs', () => {
          expect(result.programs).toHaveLength(2);
        });

        it('returns JavaScript program with correct language', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].language).toBe(ProgrammingLanguage.JAVASCRIPT);
        });

        it('returns JavaScript program with version 1', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].detectionProgram.version).toBe(1);
        });

        it('returns JavaScript program with REGEXP mode', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[0].detectionProgram.mode).toBe(
            DetectionModeEnum.REGEXP,
          );
        });

        it('returns Python program with correct language', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[1].language).toBe(ProgrammingLanguage.PYTHON);
        });

        it('returns Python program with version 3', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[1].detectionProgram.version).toBe(3);
        });

        it('returns Python program with SINGLE_AST mode', () => {
          const resultArray = result.programs as (ActiveDetectionProgram & {
            detectionProgram: DetectionProgram;
          })[];

          expect(resultArray[1].detectionProgram.mode).toBe(
            DetectionModeEnum.SINGLE_AST,
          );
        });
      });
    });
  });
});
