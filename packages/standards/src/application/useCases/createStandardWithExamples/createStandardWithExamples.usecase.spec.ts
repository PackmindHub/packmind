import { CreateStandardWithExamplesUsecase } from './createStandardWithExamples.usecase';
import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import {
  PackmindLogger,
  ProgrammingLanguage,
  RuleWithExamples,
} from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { standardFactory } from '../../../../test/standardFactory';
import { standardVersionFactory } from '../../../../test/standardVersionFactory';
import { createStandardId } from '../../../domain/entities/Standard';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';
import { v4 as uuidv4 } from 'uuid';

describe('CreateStandardWithExamplesUsecase', () => {
  let usecase: CreateStandardWithExamplesUsecase;
  let standardService: jest.Mocked<StandardService>;
  let standardVersionService: jest.Mocked<StandardVersionService>;
  let standardSummaryService: jest.Mocked<StandardSummaryService>;
  let ruleExampleRepository: jest.Mocked<IRuleExampleRepository>;
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
      listStandardsByOrganization: jest.fn(),
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

    // Use stubLogger from shared test utils
    logger = stubLogger();

    usecase = new CreateStandardWithExamplesUsecase(
      standardService,
      standardVersionService,
      standardSummaryService,
      ruleExampleRepository,
      logger,
    );
  });

  describe('createStandardWithExamples', () => {
    const baseRequest = {
      name: 'Test Standard',
      description: 'A test standard for unit testing',
      summary: null,
      organizationId,
      userId,
      scope: null,
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
        organizationId,
        userId,
        scope: null,
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue(
        existingStandards,
      );
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
        organizationId,
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
          organizationId,
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
        standardService.listStandardsByOrganization.mockResolvedValue([]);
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
          organizationId,
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
        standardService.listStandardsByOrganization.mockResolvedValue([]);
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
          organizationId,
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
        standardService.listStandardsByOrganization.mockResolvedValue([]);
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
      standardService.listStandardsByOrganization.mockResolvedValue([]);
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
  });
});
