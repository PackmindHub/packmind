import { CreateStandardWithExamplesUsecase } from './createStandardWithExamples.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { PackmindLogger } from '@packmind/logger';
import { ProgrammingLanguage, RuleWithExamples } from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { ruleFactory } from '../../../../test/ruleFactory';
import { createStandardId } from '../../../domain/entities/Standard';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';
import { createRuleExampleId } from '../../../domain/entities/RuleExample';
import { v4 as uuidv4 } from 'uuid';
import type { ILinterPort } from '@packmind/shared';

describe('CreateStandardWithExamplesUsecase', () => {
  let usecase: CreateStandardWithExamplesUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let standardSummaryService: jest.Mocked<StandardSummaryService>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
  let ruleRepository: jest.Mocked<IRuleRepository>;
  let linterAdapter: jest.Mocked<ILinterPort>;
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
      copyDetectionProgramsToNewRule: jest.fn(),
      copyRuleDetectionAssessments: jest.fn(),
      computeRuleLanguageDetectionStatus: jest.fn(),
    } as unknown as jest.Mocked<ILinterPort>;

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

    it('creates a standard with rules that have no examples', async () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' },
        { content: 'Limit line length to 100 characters' },
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

      // Mock the service calls
      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
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

    it('creates a standard with rules that have examples', async () => {
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

      // Mock the service calls
      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
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

    it('creates a standard with mixed rules (some with examples, some without)', async () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' }, // No examples
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
        { content: 'Write comprehensive documentation' }, // No examples
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

      // Mock the service calls
      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
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

    it('creates a standard with multiple examples per rule', async () => {
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

      // Mock the service calls
      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
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

    it('handles slug conflicts by appending counter', async () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' },
      ];

      // Mock existing standards with conflicting slugs
      const existingStandards = [
        standardFactory({ slug: 'test-standard' }),
        standardFactory({ slug: 'test-standard-1' }),
      ];

      const mockStandard = standardFactory({
        id: createStandardId(uuidv4()),
        name: baseRequest.name,
        slug: 'test-standard-2', // Should be incremented
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

      // Mock the service calls
      standardService.listStandardsBySpace.mockResolvedValue(existingStandards);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
      expect(standardService.addStandard).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-standard-2',
        }),
      );
    });

    it('logs warnings and skips examples with missing language', async () => {
      const rules: RuleWithExamples[] = [
        {
          content: 'Use descriptive test names',
          examples: [
            {
              positive: "it('displays error when email is invalid', () => {})",
              negative: "it('should test email validation', () => {})",
              language: undefined as unknown as ProgrammingLanguage, // Invalid language
            },
            {
              positive: 'const result = await service.call();',
              negative: 'service.call();',
              language: ProgrammingLanguage.TYPESCRIPT, // Valid language
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

      // Mock the service calls
      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockResolvedValue(
        'Generated summary',
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
      expect(logger.warn).toHaveBeenCalledWith(
        'Example missing language, skipping',
        expect.objectContaining({
          ruleContent: expect.stringContaining('Use descriptive test names'),
        }),
      );

      // Should only include the valid example
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

    it('handles AI summary generation failure gracefully', async () => {
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

      // Mock the service calls - summary generation fails
      standardService.listStandardsBySpace.mockResolvedValue([]);
      standardService.addStandard.mockResolvedValue(mockStandard);
      standardSummaryService.createStandardSummary.mockRejectedValue(
        new Error('AI service unavailable'),
      );
      standardVersionService.addStandardVersion.mockResolvedValue(
        mockStandardVersion,
      );

      const result = await usecase.createStandardWithExamples({
        ...baseRequest,
        rules,
      });

      expect(result).toEqual(mockStandard);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate summary, proceeding without summary',
        expect.objectContaining({
          error: 'AI service unavailable',
        }),
      );

      // Should still create the standard version with null summary
      expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: null,
        }),
      );
    });

    describe('when summary is provided', () => {
      it('uses provided summary', async () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
        ];
        const providedSummary = 'This is a custom summary provided by the user';

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

        // Mock the service calls
        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        // Summary generation should NOT be called since we provide a summary
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        const result = await usecase.createStandardWithExamples({
          ...baseRequest,
          summary: providedSummary,
          rules,
        });

        expect(result).toEqual(mockStandard);
        expect(
          standardSummaryService.createStandardSummary,
        ).not.toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: providedSummary,
          }),
        );
      });
    });

    describe('when summary is not provided', () => {
      it('generates summary for null summary', async () => {
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

        // Mock the service calls
        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardSummaryService.createStandardSummary.mockResolvedValue(
          'Generated summary',
        );
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        const result = await usecase.createStandardWithExamples({
          ...baseRequest,
          rules,
        });

        expect(result).toEqual(mockStandard);
        expect(standardSummaryService.createStandardSummary).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: 'Generated summary',
          }),
        );
      });

      it('generates summary for empty string summary', async () => {
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

        // Mock the service calls
        standardService.listStandardsBySpace.mockResolvedValue([]);
        standardService.addStandard.mockResolvedValue(mockStandard);
        standardSummaryService.createStandardSummary.mockResolvedValue(
          'Generated summary',
        );
        standardVersionService.addStandardVersion.mockResolvedValue(
          mockStandardVersion,
        );

        const result = await usecase.createStandardWithExamples({
          ...baseRequest,
          summary: '   ', // Empty/whitespace string
          rules,
        });

        expect(result).toEqual(mockStandard);
        expect(standardSummaryService.createStandardSummary).toHaveBeenCalled();
        expect(standardVersionService.addStandardVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: 'Generated summary',
          }),
        );
      });
    });

    it('throws error if standard creation fails', async () => {
      const rules: RuleWithExamples[] = [
        { content: 'Use consistent indentation' },
      ];

      // Mock the service calls - standard creation fails
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

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create standard with examples',
        expect.objectContaining({
          error: 'Database connection failed',
        }),
      );
    });

    describe('detection program validation', () => {
      it('validates detection programs for rules with examples', async () => {
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

        const mockStandard = standardFactory({
          id: createStandardId(uuidv4()),
          name: baseRequest.name,
          slug: 'test-standard',
        });

        const mockStandardVersion = standardVersionFactory({
          id: createStandardVersionId(uuidv4()),
          standardId: mockStandard.id,
        });

        const mockRules = [
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

        expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
          mockStandardVersion.id,
        );
        expect(ruleExampleRepository.findByRuleId).toHaveBeenCalledWith(
          mockRules[0].id,
        );
        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).toHaveBeenCalledWith({
          ruleId: mockRules[0].id,
          language: ProgrammingLanguage.TYPESCRIPT,
          organizationId,
          userId,
        });
      });

      it('skips validation for rules without examples', async () => {
        const rules: RuleWithExamples[] = [
          { content: 'Use consistent indentation' },
          { content: 'Limit line length' },
        ];

        const mockStandard = standardFactory({
          id: createStandardId(uuidv4()),
        });

        const mockStandardVersion = standardVersionFactory({
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

        expect(ruleRepository.findByStandardVersionId).toHaveBeenCalledWith(
          mockStandardVersion.id,
        );
        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).not.toHaveBeenCalled();
      });

      it('validates multiple languages for a single rule', async () => {
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
        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).toHaveBeenCalledWith({
          ruleId: mockRules[0].id,
          language: ProgrammingLanguage.TYPESCRIPT,
          organizationId,
          userId,
        });
        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).toHaveBeenCalledWith({
          ruleId: mockRules[0].id,
          language: ProgrammingLanguage.JAVASCRIPT,
          organizationId,
          userId,
        });
      });

      it('validates multiple rules with different languages', async () => {
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
        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).toHaveBeenCalledWith({
          ruleId: mockRules[0].id,
          language: ProgrammingLanguage.TYPESCRIPT,
          organizationId,
          userId,
        });
        expect(
          linterAdapter.updateRuleDetectionAssessmentAfterUpdate,
        ).toHaveBeenCalledWith({
          ruleId: mockRules[1].id,
          language: ProgrammingLanguage.PYTHON,
          organizationId,
          userId,
        });
      });

      it('handles validation errors gracefully without failing standard creation', async () => {
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
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to update detection program status',
          expect.objectContaining({
            error: 'Linter service unavailable',
          }),
        );
      });

      describe('when linter adapter is not available', () => {
        it('skips validation', async () => {
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

          // Create usecase without linter adapter
          const usecaseWithoutLinter = new CreateStandardWithExamplesUsecase(
            standardService,
            standardVersionService,
            standardSummaryService,
            ruleExampleRepository,
            ruleRepository,
            undefined,
            logger,
          );

          const result = await usecaseWithoutLinter.createStandardWithExamples({
            ...baseRequest,
            rules,
          });

          expect(result).toEqual(mockStandard);
          expect(logger.warn).toHaveBeenCalledWith(
            'Linter adapter not available, skipping detection program validation',
            expect.any(Object),
          );
        });
      });
    });
  });
});
