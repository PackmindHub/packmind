import { GetActiveDetectionProgramForRuleUseCase } from './getActiveDetectionProgramForRule.usecase';
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
      it('returns active detection programs for valid standard slug and rule id', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId,
        };

        const existingStandard = standardFactory({
          slug: standardSlug,
        });

        const existingRule = ruleFactory({
          id: ruleId,
        });

        const activeProgram1 = detectionProgramFactory({
          id: createDetectionProgramId(uuidv4()),
          ruleId,
          code: 'active code for javascript',
          version: 1,
          mode: DetectionModeEnum.SINGLE_AST,
          language: ProgrammingLanguage.JAVASCRIPT,
        });

        const activeProgram2 = detectionProgramFactory({
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

        const result = await useCase.execute(command);

        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
        expect(
          standardsAdapter.getLatestRulesByStandardId,
        ).toHaveBeenCalledWith(existingStandard.id);
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).toHaveBeenCalledWith(ruleId);
        expect(result.programs).toHaveLength(2);
        expect(result.programs[0]).toEqual(activeProgram1);
        expect(result.programs[1]).toEqual(activeProgram2);
        expect(result.scope).toBe(existingStandard.scope);
      });

      it('returns multiple active programs for different languages', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'test-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });

        const jsActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.JAVASCRIPT,
        });
        const tsActive = detectionProgramFactory({
          ruleId,
          language: ProgrammingLanguage.TYPESCRIPT,
        });
        const pyActive = detectionProgramFactory({
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

        const result = await useCase.execute(command);

        expect(result.programs).toHaveLength(3);
        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.JAVASCRIPT,
        );
        expect(result.programs[1].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
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
      it('throws error', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'nonexistent-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        standardsAdapter.findStandardBySlug.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          `Standard with slug '${standardSlug}' not found`,
        );

        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
        expect(standardsAdapter.getRule).not.toHaveBeenCalled();
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when rule not found', () => {
      it('throws error', async () => {
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

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(null);

        await expect(useCase.execute(command)).rejects.toThrow(
          `Rule with id '${ruleId}' not found`,
        );

        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when rule does not belong to standard', () => {
      it('throws error', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const otherRuleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          organizationId,
          userId: createUserId(uuidv4()),
        };

        const existingStandard = standardFactory({ slug: standardSlug });
        const existingRule = ruleFactory({ id: ruleId });
        const otherRule = ruleFactory({ id: otherRuleId });

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
        standardsAdapter.getRule.mockResolvedValue(existingRule);
        // Return a different rule that doesn't match our ruleId
        standardsAdapter.getLatestRulesByStandardId.mockResolvedValue([
          otherRule,
        ]);

        await expect(useCase.execute(command)).rejects.toThrow(
          `Rule '${ruleId}' does not belong to standard '${standardSlug}'`,
        );

        expect(standardsAdapter.findStandardBySlug).toHaveBeenCalledWith(
          standardSlug,
          organizationId,
        );
        expect(standardsAdapter.getRule).toHaveBeenCalledWith(ruleId);
        expect(
          standardsAdapter.getLatestRulesByStandardId,
        ).toHaveBeenCalledWith(existingStandard.id);
        expect(
          detectionProgramService.findActiveByRuleIdWithPrograms,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when language filter is specified', () => {
      it('returns only active programs for the specified language', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'my-standard';

        const command: GetActiveDetectionProgramForRuleCommand = {
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

        const tsActive = detectionProgramFactory({
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

        const result = await useCase.execute(command);

        expect(result.programs).toHaveLength(1);
        expect(result.programs[0]).toEqual(tsActive);
        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(result.programs[0].code).toBe('typescript active code');
      });
    });

    describe('mixed scenarios', () => {
      describe('when some have active programs and others have only drafts', () => {
        it('returns only active programs', async () => {
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

          const activeProgram = detectionProgramFactory({
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

          const result = await useCase.execute(command);

          expect(result.programs).toHaveLength(1);
          expect(result.programs[0]).toEqual(activeProgram);
          expect(result.programs[0].language).toBe(
            ProgrammingLanguage.JAVASCRIPT,
          );
        });
      });
    });
  });
});
