import { GetDraftDetectionProgramForRuleUseCase } from './getDraftDetectionProgramForRule.usecase';
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
  GetDraftDetectionProgramForRuleCommand,
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
      it('returns draft detection programs for valid standard slug and rule id', async () => {
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

        standardsAdapter.findStandardBySlug.mockResolvedValue(existingStandard);
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
        expect(result.programs[0]).toEqual(draftProgram1);
        expect(result.programs[1]).toEqual(draftProgram2);
        expect(result.scope).toBe(existingStandard.scope);
      });

      it('returns multiple drafts for different languages', async () => {
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
      it('throws error', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const ruleId = createRuleId(uuidv4());
        const standardSlug = 'nonexistent-standard';

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId: createUserId(uuidv4()),
          organizationId,
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

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId: createUserId(uuidv4()),
          organizationId,
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

        const command: GetDraftDetectionProgramForRuleCommand = {
          standardSlug,
          ruleId,
          userId: createUserId(uuidv4()),
          organizationId,
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
      it('returns only draft programs for the specified language', async () => {
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

        const result = await useCase.execute(command);

        expect(result.programs).toHaveLength(1);
        expect(result.programs[0]).toEqual(tsDraft);
        expect(result.programs[0].language).toBe(
          ProgrammingLanguage.TYPESCRIPT,
        );
        expect(result.programs[0].code).toBe('typescript draft code');
      });
    });

    describe('mixed scenarios', () => {
      describe('when some have drafts and others do not', () => {
        it('returns only draft programs', async () => {
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

          const result = await useCase.execute(command);

          expect(result.programs).toHaveLength(1);
          expect(result.programs[0]).toEqual(draftProgram);
          expect(result.programs[0].language).toBe(
            ProgrammingLanguage.TYPESCRIPT,
          );
        });
      });
    });
  });
});
