import { GetActiveDetectionProgramUseCase } from './getActiveDetectionProgram.usecase';
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
      it('returns placeholder entries for each language with examples', async () => {
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

        const result = await getActiveDetectionProgramUseCase.execute(command);
        const programs = result.programs ?? [];

        expect(programs).toHaveLength(2);
        const languages = programs.map((program) => program.language);
        expect(languages).toContain(ProgrammingLanguage.TYPESCRIPT);
        expect(languages).toContain(ProgrammingLanguage.JAVA);

        const typescriptProgram = programs.find(
          (program) => program.language === ProgrammingLanguage.TYPESCRIPT,
        );

        expect(typescriptProgram?.detectionProgram).toBeNull();
        expect(typescriptProgram?.draftDetectionProgram).toBeNull();
        expect(typescriptProgram?.isExampleOnly).toBe(true);
      });
    });

    describe('when rule does not exist', () => {
      it('throws an error', async () => {
        const command: GetActiveDetectionProgramCommand = {
          ruleId: createRuleId(uuidv4()),
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        standardsAdapter.getRule.mockResolvedValue(null);

        await expect(
          getActiveDetectionProgramUseCase.execute(command),
        ).rejects.toThrow('Rule not found');

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
              detectionProgram: detectionProgram1,
              draftDetectionProgram: null,
              detectionProgramDraftVersion: null,
            },
            {
              id: activeProgram2.id,
              detectionProgramVersion: activeProgram2.detectionProgramVersion,
              ruleId: activeProgram2.ruleId,
              language: activeProgram2.language,
              detectionProgram: detectionProgram2,
              draftDetectionProgram: null,
              detectionProgramDraftVersion: null,
            },
          ],
        });
      });
    });

    describe('with different detection program modes', () => {
      it('returns active program with REGEXP mode detection program', async () => {
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
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray[0].detectionProgram.mode).toBe(
          DetectionModeEnum.REGEXP,
        );
        expect(resultArray[0].detectionProgram.code).toBe(
          '/Controller$/.test(className)',
        );
      });

      it('returns active program with FILE_SYSTEM mode detection program', async () => {
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
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray[0].detectionProgram.mode).toBe(
          DetectionModeEnum.FILE_SYSTEM,
        );
        expect(resultArray[0].detectionProgram.code).toBe(
          'const files = fs.readdirSync(directory);',
        );
      });
    });

    describe('with different programming languages', () => {
      it('returns active program for TypeScript', async () => {
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
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray[0].language).toBe(ProgrammingLanguage.TYPESCRIPT);
      });

      it('returns active program for Python', async () => {
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
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray[0].language).toBe(ProgrammingLanguage.PYTHON);
      });
    });

    describe('with version information', () => {
      it('returns detection program with correct version information', async () => {
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
          version: 5, // Specific version
        });

        const activeProgram = activeDetectionProgramFactory({
          detectionProgramVersion: detectionProgramId,
          ruleId,
        });

        standardsAdapter.getRule.mockResolvedValue(existingRule);
        activeDetectionProgramRepository.findByRuleIdWithPrograms.mockResolvedValue(
          [{ ...activeProgram, detectionProgram, draftDetectionProgram: null }],
        );

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray[0].detectionProgram.version).toBe(5);
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
      it('returns properly structured response with all required fields', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const detectionProgramId = createDetectionProgramId(uuidv4());
        const activeProgramId = createActiveDetectionProgramId(uuidv4());

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

        const result = await getActiveDetectionProgramUseCase.execute(command);

        // Validate response structure
        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray).toHaveLength(1);
        expect(resultArray[0]).toHaveProperty('id', activeProgramId);
        expect(resultArray[0]).toHaveProperty(
          'detectionProgramVersion',
          detectionProgramId,
        );
        expect(resultArray[0]).toHaveProperty('ruleId', ruleId);
        expect(resultArray[0]).toHaveProperty(
          'language',
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(resultArray[0]).toHaveProperty('detectionProgram');
        expect(resultArray[0].detectionProgram).toHaveProperty(
          'id',
          detectionProgramId,
        );
        expect(resultArray[0].detectionProgram).toHaveProperty(
          'ruleId',
          ruleId,
        );
        expect(resultArray[0].detectionProgram).toHaveProperty(
          'code',
          'test code',
        );
        expect(resultArray[0].detectionProgram).toHaveProperty('version', 1);
        expect(resultArray[0].detectionProgram).toHaveProperty(
          'mode',
          DetectionModeEnum.REGEXP,
        );
      });
    });

    describe('multi-language support scenarios', () => {
      it('returns specific language wh language parameter is provided', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
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

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(
          activeDetectionProgramRepository.findByRuleIdAndLanguage,
        ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.TYPESCRIPT);
        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray).toHaveLength(1);
        expect(resultArray[0].language).toBe(ProgrammingLanguage.TYPESCRIPT);
      });

      it('returns all languages wh no language parameter is provided', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const detectionProgramId1 = createDetectionProgramId(uuidv4());
        const detectionProgramId2 = createDetectionProgramId(uuidv4());

        const command: GetActiveDetectionProgramCommand = {
          ruleId,
          // No language parameter
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

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(
          activeDetectionProgramRepository.findByRuleIdWithPrograms,
        ).toHaveBeenCalledWith(ruleId);
        expect(
          activeDetectionProgramRepository.findByRuleIdAndLanguage,
        ).not.toHaveBeenCalled();
        // Should return all programs when no language specified
        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray).toHaveLength(2);
        expect(resultArray[0].language).toBe(ProgrammingLanguage.JAVASCRIPT);
        expect(resultArray[1].language).toBe(ProgrammingLanguage.TYPESCRIPT);
      });

      it('returns null wh specific language has no active program', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());

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

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(
          activeDetectionProgramRepository.findByRuleIdAndLanguage,
        ).toHaveBeenCalledWith(ruleId, ProgrammingLanguage.PYTHON);
        expect(result).toEqual({ programs: null });
      });

      it('handles multiple languages with different detection program versions', async () => {
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

        const result = await getActiveDetectionProgramUseCase.execute(command);

        expect(result.programs).not.toBeNull();
        expect(Array.isArray(result.programs)).toBe(true);
        const resultArray = result.programs as (ActiveDetectionProgram & {
          detectionProgram: DetectionProgram;
        })[];
        expect(resultArray).toHaveLength(2);
        expect(resultArray[0].language).toBe(ProgrammingLanguage.JAVASCRIPT);
        expect(resultArray[0].detectionProgram.version).toBe(1);
        expect(resultArray[0].detectionProgram.mode).toBe(
          DetectionModeEnum.REGEXP,
        );
        expect(resultArray[1].language).toBe(ProgrammingLanguage.PYTHON);
        expect(resultArray[1].detectionProgram.version).toBe(3);
        expect(resultArray[1].detectionProgram.mode).toBe(
          DetectionModeEnum.SINGLE_AST,
        );
      });
    });
  });
});
