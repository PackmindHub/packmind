import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import type { ILinterPort } from '@packmind/types';
import {
  RuleAddedEvent,
  StandardCreatedEvent,
  createOrganizationId,
  createSpaceId,
  createUserId,
  ProgrammingLanguage,
  RuleWithExamples,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ruleFactory } from '../../../../test/ruleFactory';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { createRuleExampleId } from '@packmind/types';
import { createStandardId } from '@packmind/types';
import { createStandardVersionId } from '@packmind/types';
import { Standard, StandardVersion, Rule } from '@packmind/types';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { StandardService } from '../../services/StandardService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { CreateStandardWithExamplesUsecase } from './createStandardWithExamples.usecase';

describe('CreateStandardWithExamplesUsecase', () => {
  let usecase: CreateStandardWithExamplesUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let standardSummaryService: jest.Mocked<StandardSummaryService>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let linterAdapter: jest.Mocked<ILinterPort>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let logger: jest.Mocked<PackmindLogger>;

  const organizationId = createOrganizationId(uuidv4());
  const userId = createUserId(uuidv4());

  beforeEach(() => {
    // Mock StandardService
    standardService = {
      addStandard: jest.fn(),
      getStandardById: jest.fn(),
      findStandardBySlug: jest.fn(),
      updateStandard: jest.fn(),
      deleteStandard: jest.fn(),
      listStandardsBySpace: jest.fn(),
      listStandardsByUser: jest.fn(),
      listStandardsByOrganizationAndUser: jest.fn(),
    } as unknown as jest.Mocked<StandardService>;

    // Mock StandardVersionService
    standardVersionService = {
      addStandardVersion: jest.fn(),
      listStandardVersions: jest.fn(),
      getStandardVersion: jest.fn(),
      getLatestStandardVersion: jest.fn(),
      getStandardVersionById: jest.fn(),
    } as unknown as jest.Mocked<StandardVersionService>;

    // Mock StandardSummaryService
    standardSummaryService = {
      createStandardSummary: jest.fn(),
    } as unknown as jest.Mocked<StandardSummaryService>;

    // Mock RuleExampleRepository
    ruleExampleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByRuleId: jest.fn(),
      updateById: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IRuleExampleRepository>;

    // Mock RuleRepository
    ruleRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findByStandardVersionId: jest.fn(),
      updateById: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IRuleRepository>;

    // Mock LinterAdapter
    linterAdapter = {
      updateRuleDetectionAssessmentAfterUpdate: jest.fn(),
      copyLinterArtefacts: jest.fn(),
      computeRuleLanguageDetectionStatus: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;

    // Mock EventEmitterService
    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    // Use stubLogger from shared test utils
    logger = stubLogger();

    // Default mock for findByStandardVersionId - returns empty array (no rules)
    ruleRepository.findByStandardVersionId.mockResolvedValue([]);

    usecase = new CreateStandardWithExamplesUsecase(
      standardService,
      standardVersionService,
      standardSummaryService,
      ruleExampleRepository,
      ruleRepository,
      eventEmitterService,
      linterAdapter,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStandardWithExamples', () => {
    const baseRequest = {
      name: 'Test Standard',
      description: 'A test standard for unit testing',
      summary: null,
      organizationId,
      userId,
      scope: null,
      spaceId: createSpaceId(uuidv4()),
    };

    describe('when creating a standard with rules that have no examples', () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' },
        { content: 'Limit line length to 100 characters' },
      ];

      let mockStandard: Standard;
      let mockStandardVersion: StandardVersion;

      beforeEach(async () => {
        mockStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: baseRequest.name,
          slug: 'test-standard',
          description: baseRequest.description,
          version: 1,
          userId,
          scope: null,
        });

        mockStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: mockStandard.id,
          name: baseRequest.name,
          slug: 'test-standard',
          description: baseRequest.description,
          version: 1,
        });

        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardSummaryService.createStandardSummary.mockResolvedValue(
          'Generated summary',
        );
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        await usecase.createStandardWithExamples({
          ...baseRequest,
          rules,
        });
      });

      it('calls addStandard with correct parameters', () => {
        expect(standardService.addStandard).toHaveBeenCalledWith({
          name: baseRequest.name,
          description: baseRequest.description,
          slug: 'test-standard',
          version: 1,
          gitCommit: undefined,
          userId,
          scope: null,
          spaceId: baseRequest.spaceId,
        });
      });

      it('calls addStandardVersion with rules having empty examples arrays', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            standardId: mockStandard.id,
            name: baseRequest.name,
            slug: 'test-standard',
            description: baseRequest.description,
            version: 1,
            rules: [
              { content: 'Use consistent indentation', examples: [] },
              { content: 'Limit line length to 100 characters', examples: [] },
            ],
            scope: null,
            summary: 'Generated summary',
            userId,
          }),
        );
      });
    });

    it('creates a standard with rules that have examples and passes them to standardVersion', async () => {
      const rules: RuleWithExamples[] = [
        {
          content: 'Use descriptive test names',
          examples: [
            {
              positive: "it('displays error when email is invalid', () => {})",
              negative: "it('should test email validation', () => {})",
              language: ProgrammingLanguage.TYPESCRIPT,
            },
          ],
        },
        {
          content: 'Use proper error handling',
          examples: [
            {
              positive:
                'try { /* code */ } catch (error) { logger.error(error); }',
              negative: 'try { /* code */ } catch (e) { console.log(e); }',
              language: ProgrammingLanguage.JAVASCRIPT,
            },
          ],
        },
      ];

      const mockStandard = standardFactory({
        id: createStandardId(uuidv4()),
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
        userId,
        scope: null,
      });

      const mockStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: mockStandard.id,
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
      });

      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              content: 'Use descriptive test names',
              examples: expect.arrayContaining([
                expect.objectContaining({
                  lang: ProgrammingLanguage.TYPESCRIPT,
                  positive:
                    "it('displays error when email is invalid', () => {})",
                  negative: "it('should test email validation', () => {})",
                }),
              ]),
            }),
            expect.objectContaining({
              content: 'Use proper error handling',
              examples: expect.arrayContaining([
                expect.objectContaining({
                  lang: ProgrammingLanguage.JAVASCRIPT,
                  positive:
                    'try { /* code */ } catch (error) { logger.error(error); }',
                  negative: 'try { /* code */ } catch (e) { console.log(e); }',
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('creates a standard with mixed rules and normalizes rules without examples to have empty arrays', async () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' },
        {
          content: 'Use descriptive test names',
          examples: [
            {
              positive: "it('displays error when email is invalid', () => {})",
              negative: "it('should test email validation', () => {})",
              language: ProgrammingLanguage.TYPESCRIPT,
            },
          ],
        },
        { content: 'Write comprehensive documentation' },
      ];

      const mockStandard = standardFactory({
        id: createStandardId(uuidv4()),
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
        userId,
        scope: null,
      });

      const mockStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: mockStandard.id,
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
      });

      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: [
            { content: 'Use consistent indentation', examples: [] },
            expect.objectContaining({
              content: 'Use descriptive test names',
              examples: expect.arrayContaining([
                expect.objectContaining({
                  lang: ProgrammingLanguage.TYPESCRIPT,
                  positive:
                    "it('displays error when email is invalid', () => {})",
                  negative: "it('should test email validation', () => {})",
                }),
              ]),
            }),
            { content: 'Write comprehensive documentation', examples: [] },
          ],
        }),
      );
    });

    it('creates a standard with multiple examples per rule and passes all examples', async () => {
      const rules: RuleWithExamples[] = [
        {
          content: 'Use proper indexing strategies',
          examples: [
            {
              positive: 'CREATE INDEX idx_user_email ON users(email);',
              negative: 'SELECT * FROM users WHERE LOWER(email) = ?;',
              language: ProgrammingLanguage.SQL,
            },
            {
              positive: 'SELECT id, name FROM users WHERE email = ?;',
              negative: 'SELECT * FROM users;',
              language: ProgrammingLanguage.SQL,
            },
          ],
        },
      ];

      const mockStandard = standardFactory({
        id: createStandardId(uuidv4()),
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
        userId,
        scope: null,
      });

      const mockStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: mockStandard.id,
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
      });

      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: [
            expect.objectContaining({
              content: 'Use proper indexing strategies',
              examples: expect.arrayContaining([
                expect.objectContaining({
                  lang: ProgrammingLanguage.SQL,
                  positive: 'CREATE INDEX idx_user_email ON users(email);',
                  negative: 'SELECT * FROM users WHERE LOWER(email) = ?;',
                }),
                expect.objectContaining({
                  lang: ProgrammingLanguage.SQL,
                  positive: 'SELECT id, name FROM users WHERE email = ?;',
                  negative: 'SELECT * FROM users;',
                }),
              ]),
            }),
          ],
        }),
      );
    });

    describe('when conflicting slugs exist', () => {
      it('appends counter to slug', async () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
        ];

        const existingStandards = [
          standardFactory({ slug: 'test-standard' }),
          standardFactory({ slug: 'test-standard-1' }),
        ];

        const mockStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: baseRequest.name,
          slug: 'test-standard-2',
          description: baseRequest.description,
          version: 1,
          userId,
          scope: null,
        });

        const mockStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: mockStandard.id,
          name: baseRequest.name,
          slug: 'test-standard-2',
          description: baseRequest.description,
          version: 1,
        });

        standardService.listStandardsBySpace.mockResolvedValue(
          existingStandards,
        );
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardSummaryService.createStandardSummary.mockResolvedValue(
          'Generated summary',
        );
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        await usecase.createStandardWithExamples({
          ...baseRequest,
          rules,
        });

        expect(standardService.addStandard).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'test-standard-2',
          }),
        );
      });
    });

    it('skips examples with missing language and only includes valid examples', async () => {
      const rules: RuleWithExamples[] = [
        {
          content: 'Use descriptive test names',
          examples: [
            {
              positive: "it('displays error when email is invalid', () => {})",
              negative: "it('should test email validation', () => {})",
              language: undefined as unknown as ProgrammingLanguage,
            },
            {
              positive: 'const result = await service.call();',
              negative: 'service.call();',
              language: ProgrammingLanguage.TYPESCRIPT,
            },
          ],
        },
      ];

      const mockStandard = standardFactory({
        id: createStandardId(uuidv4()),
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
        userId,
        scope: null,
      });

      const mockStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: mockStandard.id,
        name: baseRequest.name,
        slug: 'test-standard',
        description: baseRequest.description,
        version: 1,
      });

      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: [
            expect.objectContaining({
              content: 'Use descriptive test names',
              examples: expect.arrayContaining([
                expect.objectContaining({
                  lang: ProgrammingLanguage.TYPESCRIPT,
                  positive: 'const result = await service.call();',
                  negative: 'service.call();',
                }),
              ]),
            }),
          ],
        }),
      );
    });

    describe('when AI summary generation fails', () => {
      it('creates standard version with null summary', async () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
        ];

        const mockStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: baseRequest.name,
          slug: 'test-standard',
          description: baseRequest.description,
          version: 1,
          userId,
          scope: null,
        });

        const mockStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: mockStandard.id,
          name: baseRequest.name,
          slug: 'test-standard',
          description: baseRequest.description,
          version: 1,
        });

        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardSummaryService.createStandardSummary.mockRejectedValue(
          new Error('AI service unavailable'),
        );
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        await usecase.createStandardWithExamples({
          ...baseRequest,
          rules,
        });

        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: null,
          }),
        );
      });
    });

    describe('when summary is provided', () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' },
      ];
      const providedSummary = 'This is a custom summary provided by the user';

      beforeEach(async () => {
        const mockStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: baseRequest.name,
          slug: 'test-standard',
          description: baseRequest.description,
          version: 1,
          userId,
          scope: null,
        });

        const mockStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: mockStandard.id,
          name: baseRequest.name,
          slug: 'test-standard',
          description: baseRequest.description,
          version: 1,
        });

        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        await usecase.createStandardWithExamples({
          ...baseRequest,
          summary: providedSummary,
          rules,
        });
      });

      it('does not call summary generation service', () => {
        expect(
          standardSummaryService.createStandardSummary,
        ).not.toHaveBeenCalled();
      });

      it('passes provided summary to addStandardVersion', () => {
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: providedSummary,
          }),
        );
      });
    });

    describe('when summary is not provided', () => {
      describe('when summary is null', () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
        ];

        beforeEach(async () => {
          const mockStandard = standardFactory({
            id: createStandardId(uuidv4()),
            name: baseRequest.name,
            slug: 'test-standard',
            description: baseRequest.description,
            version: 1,
            userId,
            scope: null,
          });

          const mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
            standardId: mockStandard.id,
            name: baseRequest.name,
            slug: 'test-standard',
            description: baseRequest.description,
            version: 1,
          });

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardSummaryService.createStandardSummary.mockResolvedValue(
            'Generated summary',
          );
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });
        });

        it('calls summary generation service', () => {
          expect(
            standardSummaryService.createStandardSummary,
          ).toHaveBeenCalled();
        });

        it('passes generated summary to addStandardVersion', () => {
          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              summary: 'Generated summary',
            }),
          );
        });
      });

      describe('when summary is whitespace only', () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
        ];

        beforeEach(async () => {
          const mockStandard = standardFactory({
            id: createStandardId(uuidv4()),
            name: baseRequest.name,
            slug: 'test-standard',
            description: baseRequest.description,
            version: 1,
            userId,
            scope: null,
          });

          const mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
            standardId: mockStandard.id,
            name: baseRequest.name,
            slug: 'test-standard',
            description: baseRequest.description,
            version: 1,
          });

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardSummaryService.createStandardSummary.mockResolvedValue(
            'Generated summary',
          );
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );

          await usecase.createStandardWithExamples({
            ...baseRequest,
            summary: '   ',
            rules,
          });
        });

        it('calls summary generation service', () => {
          expect(
            standardSummaryService.createStandardSummary,
          ).toHaveBeenCalled();
        });

        it('passes generated summary to addStandardVersion', () => {
          expect(
            standardVersionService.addStandardVersion,
          ).toHaveBeenCalledWith(
            expect.objectContaining({
              summary: 'Generated summary',
            }),
          );
        });
      });
    });

    describe('when standard creation fails', () => {
      it('throws error', async () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
        ];

        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          usecase.createStandardWithExamples({
            ...baseRequest,
            summary: null,
            rules,
          }),
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('detection program validation', () => {
      describe('when rules have examples', () => {
        const rules: RuleWithExamples[] = [
          {
            content: 'Use TypeScript for type safety',
            examples: [
              {
                language: ProgrammingLanguage.TYPESCRIPT,
                positive: 'const x: number = 5;',
                negative: 'const x = 5;',
              },
            ],
          },
        ];

        let mockStandardVersion: StandardVersion;
        let mockRules: Rule[];

        beforeEach(async () => {
          const mockStandard = standardFactory({
            id: createStandardId(uuidv4()),
            name: baseRequest.name,
            slug: 'test-standard',
          });

          mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
            standardId: mockStandard.id,
          });

          mockRules = [
            ruleFactory({
              standardVersionId: mockStandardVersion.id,
            }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);
          ruleExampleRepository.findByRuleId.mockResolvedValue([
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[0].id,
              lang: ProgrammingLanguage.TYPESCRIPT,
              positive: 'const x: number = 5;',
              negative: 'const x = 5;',
            },
          ]);
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate.mockResolvedValue(
            {
              action: 'ASSESSMENT_STARTED',
              message: 'success',
            },
          );

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });
        });

        it('queries rules by standard version id', () => {
          expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
            mockStandardVersion.id,
          );
        });

        it('queries examples by rule id', () => {
          expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(
            mockRules[0].id,
          );
        });

        it('calls linter adapter with correct parameters', () => {
          expect(
            linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
          ).toHaveBeenCalledWith({
            ruleId: mockRules[0].id,
            language: ProgrammingLanguage.TYPESCRIPT,
            organizationId,
            userId,
          });
        });
      });

      describe('when rules have no examples', () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
          { content: 'Limit line length' },
        ];

        let mockStandardVersion: StandardVersion;

        beforeEach(async () => {
          const mockStandard = standardFactory({
            id: createStandardId(uuidv4()),
          });

          mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
          });

          const mockRules = [
            ruleFactory({ standardVersionId: mockStandardVersion.id }),
            ruleFactory({ standardVersionId: mockStandardVersion.id }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);
          ruleExampleRepository.findByRuleId.mockResolvedValue([]);

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });
        });

        it('queries rules by standard version id', () => {
          expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
            mockStandardVersion.id,
          );
        });

        it('does not call linter adapter', () => {
          expect(
            linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when rule has multiple examples with different languages', () => {
        it('calls linter adapter for each language', async () => {
          const rules: RuleWithExamples[] = [
            {
              content: 'Use proper naming conventions',
              examples: [
                {
                  language: ProgrammingLanguage.TYPESCRIPT,
                  positive: 'const userName = "test";',
                  negative: 'const user_name = "test";',
                },
                {
                  language: ProgrammingLanguage.JAVASCRIPT,
                  positive: 'const userName = "test";',
                  negative: 'const user_name = "test";',
                },
              ],
            },
          ];

          const mockStandard = standardFactory();
          const mockStandardVersion = standardVersionFactory();
          const mockRules = [
            ruleFactory({ standardVersionId: mockStandardVersion.id }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);
          ruleExampleRepository.findByRuleId.mockResolvedValue([
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[0].id,
              lang: ProgrammingLanguage.TYPESCRIPT,
              positive: 'const userName = "test";',
              negative: 'const user_name = "test";',
            },
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[0].id,
              lang: ProgrammingLanguage.JAVASCRIPT,
              positive: 'const userName = "test";',
              negative: 'const user_name = "test";',
            },
          ]);
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate.mockResolvedValue(
            {
              action: 'ASSESSMENT_STARTED',
              message: 'success',
            },
          );

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });

          expect(
            linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
          ).toHaveBeenCalledTimes(2);
        });
      });

      it('calls linter adapter for each rule with examples', async () => {
        const rules: RuleWithExamples[] = [
          {
            content: 'Use TypeScript types',
            examples: [
              {
                language: ProgrammingLanguage.TYPESCRIPT,
                positive: 'const x: string = "test";',
                negative: 'const x = "test";',
              },
            ],
          },
          {
            content: 'Use Python type hints',
            examples: [
              {
                language: ProgrammingLanguage.PYTHON,
                positive: 'def func(x: int) -> int:',
                negative: 'def func(x):',
              },
            ],
          },
        ];

        const mockStandard = standardFactory();
        const mockStandardVersion = standardVersionFactory();
        const mockRules = [
          ruleFactory({ standardVersionId: mockStandardVersion.id }),
          ruleFactory({ standardVersionId: mockStandardVersion.id }),
        ];

        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );
        ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);
        ruleExampleRepository.findByRuleId
          .mockResolvedValueOnce([
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[0].id,
              lang: ProgrammingLanguage.TYPESCRIPT,
              positive: 'const x: string = "test";',
              negative: 'const x = "test";',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[1].id,
              lang: ProgrammingLanguage.PYTHON,
              positive: 'def func(x: int) -> int:',
              negative: 'def func(x):',
            },
          ]);
        linterAdapter.updateRuleDetectionAssessmentAfterUpdate.mockResolvedValue(
          {
            action: 'ASSESSMENT_STARTED',
            message: 'success',
          },
        );

        await usecase.createStandardWithExamples({
          ...baseRequest,
          rules,
        });

        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).toHaveBeenCalledTimes(2);
      });

      describe('when linter validation fails', () => {
        it('returns standard successfully', async () => {
          const rules: RuleWithExamples[] = [
            {
              content: 'Use TypeScript',
              examples: [
                {
                  language: ProgrammingLanguage.TYPESCRIPT,
                  positive: 'const x: string = "test";',
                  negative: 'const x = "test";',
                },
              ],
            },
          ];

          const mockStandard = standardFactory();
          const mockStandardVersion = standardVersionFactory();
          const mockRules = [
            ruleFactory({ standardVersionId: mockStandardVersion.id }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);
          ruleExampleRepository.findByRuleId.mockResolvedValue([
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[0].id,
              lang: ProgrammingLanguage.TYPESCRIPT,
              positive: 'const x: string = "test";',
              negative: 'const x = "test";',
            },
          ]);
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate.mockRejectedValue(
            new Error('Linter service unavailable'),
          );

          const result = await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });

          expect(result).toEqual(mockStandard);
        });
      });

      describe('when linter adapter is not available', () => {
        it('returns standard successfully without calling linter adapter', async () => {
          const rules: RuleWithExamples[] = [
            {
              content: 'Use TypeScript',
              examples: [
                {
                  language: ProgrammingLanguage.TYPESCRIPT,
                  positive: 'const x: string = "test";',
                  negative: 'const x = "test";',
                },
              ],
            },
          ];

          const mockStandard = standardFactory();
          const mockStandardVersion = standardVersionFactory();
          const mockRules = [
            ruleFactory({ standardVersionId: mockStandardVersion.id }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);
          ruleExampleRepository.findByRuleId.mockResolvedValue([
            {
              id: createRuleExampleId(uuidv4()),
              ruleId: mockRules[0].id,
              lang: ProgrammingLanguage.TYPESCRIPT,
              positive: 'const x: string = "test";',
              negative: 'const x = "test";',
            },
          ]);

          const usecaseWithoutLinter = new CreateStandardWithExamplesUsecase(
            standardService,
            standardVersionService,
            standardSummaryService,
            ruleExampleRepository,
            ruleRepository,
            eventEmitterService,
            undefined,
            logger,
          );

          const result = await usecaseWithoutLinter.createStandardWithExamples({
            ...baseRequest,
            rules,
          });

          expect(result).toEqual(mockStandard);
        });
      });
    });

    describe('event emission', () => {
      describe('when standard is created with rules', () => {
        let mockStandard: Standard;
        let mockStandardVersion: StandardVersion;
        let mockRules: Rule[];

        beforeEach(async () => {
          const rules: RuleWithExamples[] = [
            { content: 'Rule 1' },
            { content: 'Rule 2' },
          ];

          mockStandard = standardFactory({
            id: createStandardId(uuidv4()),
            name: baseRequest.name,
          });

          mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
            standardId: mockStandard.id,
            version: 1,
          });

          mockRules = [
            ruleFactory({
              id: uuidv4(),
              standardVersionId: mockStandardVersion.id,
            }),
            ruleFactory({
              id: uuidv4(),
              standardVersionId: mockStandardVersion.id,
            }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });
        });

        it('emits correct number of events', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(3);
        });

        it('emits StandardCreatedEvent as first event', () => {
          const firstCall = eventEmitterService.emit.mock.calls[0][0];
          expect(firstCall).toBeInstanceOf(StandardCreatedEvent);
        });

        it('emits RuleAddedEvent for each rule', () => {
          const secondCall = eventEmitterService.emit.mock.calls[1][0];
          expect(secondCall).toBeInstanceOf(RuleAddedEvent);
        });
      });

      describe('when querying rules repository', () => {
        let mockStandardVersion: StandardVersion;

        beforeEach(async () => {
          const rules: RuleWithExamples[] = [{ content: 'Rule 1' }];

          const mockStandard = standardFactory();
          mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
          });

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue([
            ruleFactory({ standardVersionId: mockStandardVersion.id }),
          ]);

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });
        });

        it('calls findByStandardVersionId with correct standardVersionId', () => {
          expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
            createStandardVersionId(mockStandardVersion.id),
          );
        });
      });

      describe('when originSkill is provided', () => {
        let mockStandard: Standard;
        let mockStandardVersion: StandardVersion;
        let mockRules: Rule[];
        const originSkill = 'test-skill';

        beforeEach(async () => {
          const rules: RuleWithExamples[] = [{ content: 'Rule 1' }];

          mockStandard = standardFactory({
            id: createStandardId(uuidv4()),
            name: baseRequest.name,
          });

          mockStandardVersion = standardVersionFactory({
            id: createStandardVersionId(uuidv4()),
            standardId: mockStandard.id,
            version: 1,
          });

          mockRules = [
            ruleFactory({
              id: uuidv4(),
              standardVersionId: mockStandardVersion.id,
            }),
          ];

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue(mockRules);

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
            originSkill,
          });
        });

        it('includes originSkill in StandardCreatedEvent', () => {
          const firstCall = eventEmitterService.emit.mock
            .calls[0][0] as StandardCreatedEvent;
          expect(firstCall.payload.originSkill).toBe(originSkill);
        });

        it('includes originSkill in RuleAddedEvent', () => {
          const secondCall = eventEmitterService.emit.mock
            .calls[1][0] as RuleAddedEvent;
          expect(secondCall.payload.originSkill).toBe(originSkill);
        });
      });

      describe('when standard is created without rules', () => {
        beforeEach(async () => {
          const rules: RuleWithExamples[] = [];

          const mockStandard = standardFactory();
          const mockStandardVersion = standardVersionFactory();

          standardService.listStandardsBySpace.mockResolvedValue([]);
          standardService.addStandard.mockResolvedValue(mockStandard);
          standardVersionService.addStandardVersion.mockResolvedValue(
            mockStandardVersion,
          );
          ruleRepository.findByStandardVersionId.mockResolvedValue([]);

          await usecase.createStandardWithExamples({
            ...baseRequest,
            rules,
          });
        });

        it('emits only one event', () => {
          expect(eventEmitterService.emit).toHaveBeenCalledTimes(1);
        });

        it('emits StandardCreatedEvent', () => {
          const firstCall = eventEmitterService.emit.mock.calls[0][0];
          expect(firstCall).toBeInstanceOf(StandardCreatedEvent);
        });
      });
    });
  });
});
