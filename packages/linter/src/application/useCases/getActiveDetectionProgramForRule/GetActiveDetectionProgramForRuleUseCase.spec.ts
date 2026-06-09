import { GetActiveDetectionProgramForRuleUseCase } from './GetActiveDetectionProgramForRuleUseCase';
import { DetectionProgramService } from '../../services/DetectionProgramService';
import { ruleFactory } from '@packmind/standards/test';
import { standardFactory } from '@packmind/standards/test';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/types';
import {
  createRuleId,
  IStandardsPort,
  ProgrammingLanguage,
  createActiveDetectionProgramId,
  createDetectionProgramId,
  DetectionModeEnum,
  DetectionSeverity,
  GetActiveDetectionProgramForRuleCommand,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';

describe('GetActiveDetectionProgramForRuleUseCase', () => {
  let useCase: GetActiveDetectionProgramForRuleUseCase;
  let detectionProgramService: jest.Mocked<DetectionProgramService>;
  let standardsAdapter: jest.Mocked<IStandardsPort>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    detectionProgramService = {
      findActiveByRuleIdWithPrograms: jest.fn(),
    } as unknown as jest.Mocked<DetectionProgramService>;

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

    stubbedLogger = stubLogger();

    useCase = new GetActiveDetectionProgramForRuleUseCase(
      detectionProgramService,
      standardsAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when active detection programs exist', () => {
      let organizationId: ReturnType<typeof createOrganizationId>;
      let userId: ReturnType<typeof createUserId>;
      let ruleId: ReturnType<typeof createRuleId>;
      let standardSlug: string;
      let command: GetActiveDetectionProgramForRuleCommand;
      let existingStandard: ReturnType<typeof standardFactory>;
      let existingRule: ReturnType<typeof ruleFactory>;
      let activeProgram1: ReturnType<typeof detectionProgramFactory>;
      let activeProgram2: ReturnType<typeof detectionProgramFactory>;

      beforeEach(() => {
        organizationId = createOrganizationId(uuidv4());
        userId = createUserId(uuidv4());
        ruleId = createRuleId(uuidv4());
        standardSlug = 'my-standard';

        command = {
          standardSlug,
          ruleId,
          organizationId,
          userId,
        };

        existingStandard = standardFactory({
          slug: standardSlug,
        });

        existingRule = ruleFactory({
          id: ruleId,
        });

        activeProgram1 = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: 'active code for javascript',
          version: 1,
          mode: DetectionModeEnum.SINGLE_AST,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        activeProgram2 = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: 'active code for typescript',
          version: 1,
          mode: DetectionModeEnum.SINGLE_AST,
          language: ProgrammingLanguage.TYPESCRIPT,
        });

        const activeDetectionProgram1 = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: activeProgram1.id,
        });

        const activeDetectionProgram2 = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionProgramVersion: activeProgram2.id,
        });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
        detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
          [
            {
              ...activeDetectionProgram1,
              detectionProgram: activeProgram1,
              draftDetectionProgram: null,
            },
            {
              ...activeDetectionProgram2,
              detectionProgram: activeProgram2,
              draftDetectionProgram: null,
            },
          ],
        );
      });

      it('calls findStandardBySlug with standard slug and organization id', async () => {
        await useCase.execute(command);

        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
      });

      it('calls getRule with rule id', async () => {
        await useCase.execute(command);

        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
      });

      it('calls getLatestRulesByStandardId with standard id', async () => {
        await useCase.execute(command);

        expect(
          standardsAdapter.getLatestRulesByStandardId,
        ).toHaveBeenCalledWith(existingStandard.id);
      });

      it('calls findActiveByRuleIdWithPrograms with rule id', async () => {
        await useCase.execute(command);

        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).toHaveBeenCalledWith(ruleId);
      });

      it('returns two active programs', async () => {
        const result = await useCase.execute(command);

        expect(result.programs).toHaveLength(2);
      });

      it('returns first active program matching javascript with severity', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[0]).toEqual({
          ...activeProgram1,
          severity: DetectionSeverity.ERROR,
        });
      });

      it('returns second active program matching typescript with severity', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[1]).toEqual({
          ...activeProgram2,
          severity: DetectionSeverity.ERROR,
        });
      });

      it('returns scope from existing standard', async () => {
        const result = await useCase.execute(command);

        expect(result.scope).toBe(existingStandard.scope);
      });
    });

    describe('when detectionProgram language is missing', () => {
      let ruleId: ReturnType<typeof createRuleId>;
      let command: GetActiveDetectionProgramForRuleCommand;

      beforeEach(() => {
        const organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        command = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
      });

      it('falls back to activeDetectionProgram language', async () => {
        const detectionProgram = detectionProgramFactory({
          ruleId,
          language: null as unknown as ProgrammingLanguage,
        });

        detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
          [
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.TYPESCRIPT,
              }),
              detectionProgram,
              draftDetectionProgram: null,
            },
          ],
        );

        const result = await useCase.execute(command);

        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      describe('when detectionProgram language is defined', () => {
        it('uses detectionProgram language over activeDetectionProgram language', async () => {
          const detectionProgram = detectionProgramFactory({
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
          });

          detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeDetectionProgramFactory({
                  ruleId,
                  language: ProgrammingLanguage.JAVASCRIPT,
                }),
                detectionProgram,
                draftDetectionProgram: null,
              },
            ],
          );

          const result = await useCase.execute(command);

          expect(result.programs[0].language).toBe(
            ProgrammingLanguage.TYPESCRIPT,
          );
        });
      });
    });

    describe('when multiple active programs exist for different languages', () => {
      let ruleId: ReturnType<typeof createRuleId>;
      let command: GetActiveDetectionProgramForRuleCommand;
      let jsActive: ReturnType<typeof detectionProgramFactory>;
      let tsActive: ReturnType<typeof detectionProgramFactory>;
      let pyActive: ReturnType<typeof detectionProgramFactory>;

      beforeEach(() => {
        const organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        const standardSlug = 'test-standard';

        command = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        jsActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });
        tsActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        });
        pyActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.PYTHON,
        });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
        detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
          [
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.JAVASCRIPT,
              }),
              detectionProgram: jsActive,
              draftDetectionProgram: null,
            },
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.TYPESCRIPT,
              }),
              detectionProgram: tsActive,
              draftDetectionProgram: null,
            },
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.PYTHON,
              }),
              detectionProgram: pyActive,
              draftDetectionProgram: null,
            },
          ],
        );
      });

      it('returns three active programs', async () => {
        const result = await useCase.execute(command);

        expect(result.programs).toHaveLength(3);
      });

      it('returns first program as JavaScript', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
      });

      it('returns second program as TypeScript', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[1].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('returns third program as Python', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[2].language).toBe(ProgrammingLanguage.PYTHON);
      });
    });

    describe('when no active programs exist', () => {
      it('returns empty array', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
        detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
          [],
        );

        const result = await useCase.execute(command);

        expect(result.programs).toEqual([]);
      });

      describe('when only draft programs exist', () => {
        it('returns empty array', async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const standardSlug = 'my-standard';

          const command: GetActiveDetectionProgramForRuleCommand = {
            standardSlug,
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingStandard = standardFactory({ slug: standardSlug });
          const existingRule = ruleFactory({ id: ruleId });

          const draftProgram = detectionProgramFactory({
            ruleId,
            code: 'draft code',
          });

          const activeProgram = activeDetectionProgramFactory({
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
            detectionProgramVersion: null,
            detectionProgramDraftVersion: draftProgram.id,
          });

          standardsAdapter.findStandardBySlug.mockResolvedValue(
            existingStandard,
          );
          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
            existingRule,
          ]);
          detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeProgram,
                detectionProgram: null,
                draftDetectionProgram: draftProgram,
              },
            ],
          );

          const result = await useCase.execute(command);

          expect(result.programs).toEqual([]);
        });
      });
    });

    describe('when standard not found', () => {
      let organizationId: ReturnType<typeof createOrganizationId>;
      let ruleId: ReturnType<typeof createRuleId>;
      let standardSlug: string;
      let thrownError: Error | null;

      beforeEach(async () => {
        organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        standardSlug = 'nonexistent-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        standardsAdapter.findStandardBySlug.mockResolvedValue(null);

        thrownError = null;
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error with standard slug in message', () => {
        expect(thrownError?.message).toBe(
          `Standard with slug '${standardSlug}' not found`,
        );
      });

      it('calls findStandardBySlug with standard slug and organization id', () => {
        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
      });

      it('does not call getRule', () => {
        expect(standardsAdapter.getRule).not.toHaveBeenCalled();
      });

      it('does not call findActiveByRuleIdWithPrograms', () => {
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when rule not found', () => {
      let organizationId: ReturnType<typeof createOrganizationId>;
      let ruleId: ReturnType<typeof createRuleId>;
      let standardSlug: string;
      let thrownError: Error | null;

      beforeEach(async () => {
        organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        standardSlug = 'my-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingStandard = standardFactory({ slug: standardSlug });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(null);

        thrownError = null;
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error with rule id in message', () => {
        expect(thrownError?.message).toBe(`Rule with id '${ruleId}' not found`);
      });

      it('calls findStandardBySlug with standard slug and organization id', () => {
        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
      });

      it('calls getRule with rule id', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
      });

      it('does not call findActiveByRuleIdWithPrograms', () => {
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when rule does not belong to standard', () => {
      let organizationId: ReturnType<typeof createOrganizationId>;
      let ruleId: ReturnType<typeof createRuleId>;
      let standardSlug: string;
      let existingStandard: ReturnType<typeof standardFactory>;
      let thrownError: Error | null;

      beforeEach(async () => {
        organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        const otherRuleId = createRuleId(uuidv4());
        standardSlug = 'my-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });
        const otherRule = ruleFactory({ id: otherRuleId });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          otherRule,
        ]);

        thrownError = null;
        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error with rule id and standard slug in message', () => {
        expect(thrownError?.message).toBe(
          `Rule '${ruleId}' does not belong to standard '${standardSlug}'`,
        );
      });

      it('calls findStandardBySlug with standard slug and organization id', () => {
        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
      });

      it('calls getRule with rule id', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
      });

      it('calls getLatestRulesByStandardId with standard id', () => {
        expect(
          standardsAdapter.getLatestRulesByStandardId,
        ).toHaveBeenCalledWith(existingStandard.id);
      });

      it('does not call findActiveByRuleIdWithPrograms', () => {
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when language filter is specified', () => {
      let ruleId: ReturnType<typeof createRuleId>;
      let command: GetActiveDetectionProgramForRuleCommand;
      let tsActive: ReturnType<typeof detectionProgramFactory>;

      beforeEach(() => {
        const organizationId = createOrganizationId(uuidv4());
        ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        command = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
          language: 'TypeScript',
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        const jsActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          code: 'javascript active code',
        });

        tsActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          code: 'typescript active code',
        });

        const pyActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.PYTHON,
          code: 'python active code',
        });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
        detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
          [
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.JAVASCRIPT,
              }),
              detectionProgram: jsActive,
              draftDetectionProgram: null,
            },
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.TYPESCRIPT,
              }),
              detectionProgram: tsActive,
              draftDetectionProgram: null,
            },
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.PYTHON,
              }),
              detectionProgram: pyActive,
              draftDetectionProgram: null,
            },
          ],
        );
      });

      it('returns only one program', async () => {
        const result = await useCase.execute(command);

        expect(result.programs).toHaveLength(1);
      });

      it('returns the typescript active program with severity', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[0]).toEqual({
          ...tsActive,
          severity: DetectionSeverity.ERROR,
        });
      });

      it('returns program with TypeScript language', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('returns program with typescript active code', async () => {
        const result = await useCase.execute(command);

        expect(result.programs[0].code).toBe('typescript active code');
      });
    });

    describe('mixed scenarios', () => {
      describe('when some have active programs and others have only drafts', () => {
        let ruleId: ReturnType<typeof createRuleId>;
        let command: GetActiveDetectionProgramForRuleCommand;
        let activeProgram: ReturnType<typeof detectionProgramFactory>;

        beforeEach(() => {
          const organizationId = createOrganizationId(uuidv4());
          ruleId = createRuleId(uuidv4());
          const standardSlug = 'my-standard';

          command = {
            standardSlug,
            ruleId,
            organizationId,
            userId: createUserId(uuidv4()),
          };

          const existingStandard = standardFactory({ slug: standardSlug });
          const existingRule = ruleFactory({ id: ruleId });

          activeProgram = detectionProgramFactory({
            ruleId,
            language: ProgrammingLanguage.JAVASCRIPT,
          });

          const draftProgram = detectionProgramFactory({
            ruleId,
            language: ProgrammingLanguage.TYPESCRIPT,
            code: 'typescript draft',
          });

          standardsAdapter.findStandardBySlug.mockResolvedValue(
            existingStandard,
          );
          standardsAdapter.getRule.mockResolvedValue(existingRule);
          standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
            existingRule,
          ]);
          detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
            [
              {
                ...activeDetectionProgramFactory({
                  ruleId,
                  language: ProgrammingLanguage.JAVASCRIPT,
                }),
                detectionProgram: activeProgram,
                draftDetectionProgram: null,
              },
              {
                ...activeDetectionProgramFactory({
                  ruleId,
                  language: ProgrammingLanguage.TYPESCRIPT,
                }),
                detectionProgram: null,
                draftDetectionProgram: draftProgram,
              },
            ],
          );
        });

        it('returns only one program', async () => {
          const result = await useCase.execute(command);

          expect(result.programs).toHaveLength(1);
        });

        it('returns the active program with severity', async () => {
          const result = await useCase.execute(command);

          expect(result.programs[0]).toEqual({
            ...activeProgram,
            severity: DetectionSeverity.ERROR,
          });
        });

        it('returns the JavaScript active program', async () => {
          const result = await useCase.execute(command);

          expect(result.programs[0].language).toBe(
            ProgrammingLanguage.JAVASCRIPT,
          );
        });
      });
    });
  });
});
