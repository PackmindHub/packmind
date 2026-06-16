import { GetDraftDetectionProgramForRuleUseCase } from './GetDraftDetectionProgramForRuleUseCase';
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
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import {
  activeDetectionProgramFactory,
  detectionProgramFactory,
} from '../../../../test';

describe('GetDraftDetectionProgramForRuleUseCase', () => {
  let useCase: GetDraftDetectionProgramForRuleUseCase;
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

    useCase = new GetDraftDetectionProgramForRuleUseCase(
      detectionProgramService,
      standardsAdapter,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('when draft detection programs exist', () => {
      describe('when valid standard slug and rule id provided', () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId,
          organizationId,
        };

        const existingStandard = standardFactory({
          slug: standardSlug,
        });

        const existingRule = ruleFactory({
          id: ruleId,
        });

        const draftProgram1 = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: 'draft code for javascript',
          version: 2,
          mode: DetectionModeEnum.SINGLE_AST,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const draftProgram2 = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: 'draft code for typescript',
          version: 2,
          mode: DetectionModeEnum.SINGLE_AST,
          language: ProgrammingLanguage.TYPESCRIPT,
        });

        const activeProgram1 = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramDraftVersion: draftProgram1.id,
        });

        const activeProgram2 = activeDetectionProgramFactory({
          id: createActiveDetectionProgramId(uuidv4()),
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          detectionProgramDraftVersion: draftProgram2.id,
        });

        let result: GetDraftDetectionProgramForRuleResponse;

        beforeEach(async () => {
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
                ...activeProgram1,
                detectionProgram: null,
                draftDetectionProgram: draftProgram1,
              },
              {
                ...activeProgram2,
                detectionProgram: null,
                draftDetectionProgram: draftProgram2,
              },
            ],
          );

          result = await useCase.execute(command);
        });

        it('calls findStandardBySlug with correct parameters', () => {
          expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
            standardSlug,
            organizationId,
          );
        });

        it('calls getRule with correct ruleId', () => {
          expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
        });

        it('calls getLatestRulesByStandardId with correct standardId', () => {
          expect(
            standardsAdapter.getLatestRulesByStandardId,
          ).toHaveBeenCalledWith(existingStandard.id);
        });

        it('calls findActiveByRuleIdWithPrograms with correct ruleId', () => {
          expect(
            detectionProgramService.findActiveByRuleIdWithPrograms,
          ).toHaveBeenCalledWith(ruleId);
        });

        it('returns two draft programs', () => {
          expect(result.programs).toHaveLength(2);
        });

        it('returns first draft program with severity', () => {
          expect(result.programs[0]).toEqual({
            ...draftProgram1,
            severity: DetectionSeverity.ERROR,
          });
        });

        it('returns second draft program with severity', () => {
          expect(result.programs[1]).toEqual({
            ...draftProgram2,
            severity: DetectionSeverity.ERROR,
          });
        });

        it('returns correct scope from standard', () => {
          expect(result.scope).toBe(existingStandard.scope);
        });
      });

      describe('when multiple drafts exist for different languages', () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'test-standard';

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        const jsDraft = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });
        const tsDraft = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        });
        const pyDraft = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.PYTHON,
        });

        let result: GetDraftDetectionProgramForRuleResponse;

        beforeEach(async () => {
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
                detectionProgram: null,
                draftDetectionProgram: jsDraft,
              },
              {
                ...activeDetectionProgramFactory({
                  ruleId,
                  language: ProgrammingLanguage.TYPESCRIPT,
                }),
                detectionProgram: null,
                draftDetectionProgram: tsDraft,
              },
              {
                ...activeDetectionProgramFactory({
                  ruleId,
                  language: ProgrammingLanguage.PYTHON,
                }),
                detectionProgram: null,
                draftDetectionProgram: pyDraft,
              },
            ],
          );

          result = await useCase.execute(command);
        });

        it('returns three draft programs', () => {
          expect(result.programs).toHaveLength(3);
        });

        it('returns JavaScript draft first', () => {
          expect(result.programs[0].language).toBe(
            ProgrammingLanguage.JAVASCRIPT,
          );
        });

        it('returns TypeScript draft second', () => {
          expect(result.programs[1].language).toBe(
            ProgrammingLanguage.TYPESCRIPT,
          );
        });

        it('returns Python draft third', () => {
          expect(result.programs[2].language).toBe(ProgrammingLanguage.PYTHON);
        });
      });
    });

    describe('when draftDetectionProgram language is missing', () => {
      const organizationId = createOrganizationId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const standardSlug = 'my-standard';

      const command: GetDraftDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId,
        userId: createUserId(uuidv4()),
        organizationId,
      };

      const existingStandard = standardFactory({ slug: standardSlug });
      const existingRule = ruleFactory({ id: ruleId });

      beforeEach(() => {
        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
      });

      it('falls back to activeDetectionProgram language', async () => {
        const draftProgram = detectionProgramFactory({
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
              detectionProgram: null,
              draftDetectionProgram: draftProgram,
            },
          ],
        );

        const result = await useCase.execute(command);

        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      describe('when draftDetectionProgram language is defined', () => {
        it('uses draftDetectionProgram language over activeDetectionProgram language', async () => {
          const draftProgram = detectionProgramFactory({
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
                detectionProgram: null,
                draftDetectionProgram: draftProgram,
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

    describe('when no draft programs exist', () => {
      it('returns empty array', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        const publishedProgram = detectionProgramFactory({
          ruleId,
          code: 'published code',
        });

        const activeProgram = activeDetectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
          detectionProgramVersion: publishedProgram.id,
          detectionProgramDraftVersion: null,
        });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          existingRule,
        ]);
        detectionProgramService.findActiveByRuleIdWithPrograms.mockResolvedValue(
          [
            {
              ...activeProgram,
              detectionProgram: publishedProgram,
              draftDetectionProgram: null,
            },
          ],
        );

        const result = await useCase.execute(command);

        expect(result.programs).toEqual([]);
      });

      describe('when no active programs exist at all', () => {
        it('returns empty array', async () => {
          const organizationId = createOrganizationId(uuidv4());
          const ruleId = createRuleId(uuidv4());
          const standardSlug = 'my-standard';

          const command: GetDraftDetectionProgramForRuleCommand = {
            standardSlug,
            ruleId,
            userId: createUserId(uuidv4()),
            organizationId,
          };

          const existingStandard = standardFactory({ slug: standardSlug });
          const existingRule = ruleFactory({ id: ruleId });

          standardsAdapter.findStandardBySlug.mockResolvedValue(
            existingStandard,
          );
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
      });
    });

    describe('when standard not found', () => {
      const organizationId = createOrganizationId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const standardSlug = 'nonexistent-standard';

      const command: GetDraftDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId,
        userId: createUserId(uuidv4()),
        organizationId,
      };

      let thrownError: Error;

      beforeEach(async () => {
        standardsAdapter.findStandardBySlug.mockResolvedValue(null);

        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error with standard not found message', () => {
        expect(thrownError.message).toBe(
          `Standard with slug '${standardSlug}' not found`,
        );
      });

      it('calls findStandardBySlug with correct parameters', () => {
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
      const organizationId = createOrganizationId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const standardSlug = 'my-standard';

      const command: GetDraftDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId,
        userId: createUserId(uuidv4()),
        organizationId,
      };

      const existingStandard = standardFactory({ slug: standardSlug });

      let thrownError: Error;

      beforeEach(async () => {
        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(null);

        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error with rule not found message', () => {
        expect(thrownError.message).toBe(`Rule with id '${ruleId}' not found`);
      });

      it('calls findStandardBySlug with correct parameters', () => {
        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
      });

      it('calls getRule with correct ruleId', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
      });

      it('does not call findActiveByRuleIdWithPrograms', () => {
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when rule does not belong to standard', () => {
      const organizationId = createOrganizationId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const otherRuleId = createRuleId(uuidv4());
      const standardSlug = 'my-standard';

      const command: GetDraftDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId,
        userId: createUserId(uuidv4()),
        organizationId,
      };

      const existingStandard = standardFactory({ slug: standardSlug });
      const existingRule = ruleFactory({ id: ruleId });
      const otherRule = ruleFactory({ id: otherRuleId });

      let thrownError: Error;

      beforeEach(async () => {
        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          otherRule,
        ]);

        try {
          await useCase.execute(command);
        } catch (error) {
          thrownError = error as Error;
        }
      });

      it('throws error with rule does not belong message', () => {
        expect(thrownError.message).toBe(
          `Rule '${ruleId}' does not belong to standard '${standardSlug}'`,
        );
      });

      it('calls findStandardBySlug with correct parameters', () => {
        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
      });

      it('calls getRule with correct ruleId', () => {
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
      });

      it('calls getLatestRulesByStandardId with correct standardId', () => {
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
      const organizationId = createOrganizationId(uuidv4());
      const ruleId = createRuleId(uuidv4());
      const standardSlug = 'my-standard';

      const command: GetDraftDetectionProgramForRuleCommand = {
        standardSlug,
        ruleId,
        userId: createUserId(uuidv4()),
        organizationId,
        language: 'TypeScript',
      };

      const existingStandard = standardFactory({ slug: standardSlug });
      const existingRule = ruleFactory({ id: ruleId });

      const jsDraft = detectionProgramFactory({
        ruleId,
        language: ProgrammingLanguage.JAVASCRIPT,
        code: 'javascript draft code',
      });

      const tsDraft = detectionProgramFactory({
        ruleId,
        language: ProgrammingLanguage.TYPESCRIPT,
        code: 'typescript draft code',
      });

      const pyDraft = detectionProgramFactory({
        ruleId,
        language: ProgrammingLanguage.PYTHON,
        code: 'python draft code',
      });

      let result: GetDraftDetectionProgramForRuleResponse;

      beforeEach(async () => {
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
              detectionProgram: null,
              draftDetectionProgram: jsDraft,
            },
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.TYPESCRIPT,
              }),
              detectionProgram: null,
              draftDetectionProgram: tsDraft,
            },
            {
              ...activeDetectionProgramFactory({
                ruleId,
                language: ProgrammingLanguage.PYTHON,
              }),
              detectionProgram: null,
              draftDetectionProgram: pyDraft,
            },
          ],
        );

        result = await useCase.execute(command);
      });

      it('returns only one draft program', () => {
        expect(result.programs).toHaveLength(1);
      });

      it('returns the TypeScript draft program with severity', () => {
        expect(result.programs[0]).toEqual({
          ...tsDraft,
          severity: DetectionSeverity.ERROR,
        });
      });

      it('returns program with TypeScript language', () => {
        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
      });

      it('returns program with correct code', () => {
        expect(result.programs[0].code).toBe('typescript draft code');
      });
    });

    describe('mixed scenarios', () => {
      describe('when some have drafts and others do not', () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId: createUserId(uuidv4()),
          organizationId,
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        const publishedProgram = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const draftProgram = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
          code: 'typescript draft',
        });

        let result: GetDraftDetectionProgramForRuleResponse;

        beforeEach(async () => {
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
                detectionProgram: publishedProgram,
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

          result = await useCase.execute(command);
        });

        it('returns only one draft program', () => {
          expect(result.programs).toHaveLength(1);
        });

        it('returns the draft program with severity', () => {
          expect(result.programs[0]).toEqual({
            ...draftProgram,
            severity: DetectionSeverity.ERROR,
          });
        });

        it('returns program with TypeScript language', () => {
          expect(result.programs[0].language).toBe(
            ProgrammingLanguage.TYPESCRIPT,
          );
        });
      });
    });
  });
});
