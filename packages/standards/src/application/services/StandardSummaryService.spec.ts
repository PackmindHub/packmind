import { PackmindLogger } from '@packmind/logger';
import { AiNotConfigured, AIService, OpenAIService } from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import { RuleExample } from '@packmind/types';
import { standardVersionFactory } from '../../../test/standardVersionFactory';
import { createStandardId } from '../../domain/entities/Standard';
import { StandardVersion } from '../../domain/entities/StandardVersion';
import { StandardSummaryService } from './StandardSummaryService';

import { v4 as uuidv4 } from 'uuid';

// Mock OpenAIService
jest.mock('@packmind/shared', () => ({
  ...jest.requireActual('@packmind/shared'),
  OpenAIService: jest.fn(),
}));

const MockedOpenAIService = OpenAIService as jest.MockedClass<
  typeof OpenAIService
>;

describe('StandardSummaryService', () => {
  let standardSummaryService: StandardSummaryService;
  let mockAIService: jest.Mocked<AIService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock AIService instance
    mockAIService = {
      isConfigured: jest.fn(),
      executePrompt: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    // Mock OpenAIService constructor to return our mock
    MockedOpenAIService.mockImplementation(
      () => mockAIService as unknown as OpenAIService,
    );

    stubbedLogger = stubLogger();

    // Default: AI service is configured unless specified otherwise
    mockAIService.isConfigured.mockResolvedValue(true);

    standardSummaryService = new StandardSummaryService(stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStandardSummary', () => {
    describe('when AI service responds successfully', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;
      let rules: Array<{ content: string; examples: RuleExample[] }>;
      let result: string;

      beforeEach(async () => {
        standardVersionData = standardVersionFactory({
          name: 'TypeScript Configuration Standard',
          description:
            'Defines TypeScript compiler settings and project structure',
          scope: 'src/**/*.ts',
        });

        rules = [
          { content: 'Use strict mode in tsconfig.json', examples: [] },
          { content: 'Enable noImplicitAny compiler option', examples: [] },
        ];

        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: '  Generate consistent TypeScript configurations across projects to maintain code quality and ensure proper type checking when developing new features.  ',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        result = await standardSummaryService.createStandardSummary(
          standardVersionData,
          rules,
        );
      });

      it('includes the standard name in the AI prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain(
          '**Standard Name:** TypeScript Configuration Standard',
        );
      });

      it('includes the standard description in the AI prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain(
          '**Description:** Defines TypeScript compiler settings and project structure',
        );
      });

      it('includes the scope in the AI prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain('**Scope:** src/**/*.ts');
      });

      it('includes the first rule in the AI prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain('* Use strict mode in tsconfig.json');
      });

      it('includes the second rule in the AI prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain(
          '* Enable noImplicitAny compiler option',
        );
      });

      it('replaces prompt placeholders correctly', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain('TypeScript Configuration Standard');
        expect(calledPrompt).toContain(
          'Defines TypeScript compiler settings and project structure',
        );
        expect(calledPrompt).toContain('src/**/*.ts');
        expect(calledPrompt).not.toContain('{name}');
        expect(calledPrompt).not.toContain('{description}');
        expect(calledPrompt).not.toContain('{scope}');
        expect(calledPrompt).not.toContain('{rules}');
      });

      it('returns trimmed summary from AI service', () => {
        expect(result).toBe(
          'Generate consistent TypeScript configurations across projects to maintain code quality and ensure proper type checking when developing new features.',
        );
      });
    });

    describe('quote removal from AI responses', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;
      let rules: Array<{ content: string; examples: RuleExample[] }>;

      beforeEach(() => {
        standardVersionData = {
          standardId: createStandardId(uuidv4()),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Test description',
          version: 1,
          summary: null,
          scope: null,
        };
        rules = [];
      });

      it('removes surrounding double quotes from AI response', async () => {
        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: '"Create comprehensive unit tests with Jest to ensure code quality and prevent regressions."',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        const result = await standardSummaryService.createStandardSummary(
          standardVersionData,
          rules,
        );

        expect(result).toBe(
          'Create comprehensive unit tests with Jest to ensure code quality and prevent regressions.',
        );
      });

      describe('when no surrounding quotes are present', () => {
        it('preserves content', async () => {
          mockAIService.executePrompt.mockResolvedValue({
            success: true,
            data: 'Create comprehensive unit tests with Jest to ensure code quality and prevent regressions.',
            attempts: 1,
            model: 'gpt-4o-mini',
          });

          const result = await standardSummaryService.createStandardSummary(
            standardVersionData,
            rules,
          );

          expect(result).toBe(
            'Create comprehensive unit tests with Jest to ensure code quality and prevent regressions.',
          );
        });
      });

      describe('when only starting quote is present', () => {
        it('preserves content', async () => {
          mockAIService.executePrompt.mockResolvedValue({
            success: true,
            data: '"Create comprehensive unit tests with Jest to ensure code quality.',
            attempts: 1,
            model: 'gpt-4o-mini',
          });

          const result = await standardSummaryService.createStandardSummary(
            standardVersionData,
            rules,
          );

          expect(result).toBe(
            '"Create comprehensive unit tests with Jest to ensure code quality.',
          );
        });
      });

      describe('when only ending quote is present', () => {
        it('preserves content', async () => {
          mockAIService.executePrompt.mockResolvedValue({
            success: true,
            data: 'Create comprehensive unit tests with Jest to ensure code quality."',
            attempts: 1,
            model: 'gpt-4o-mini',
          });

          const result = await standardSummaryService.createStandardSummary(
            standardVersionData,
            rules,
          );

          expect(result).toBe(
            'Create comprehensive unit tests with Jest to ensure code quality."',
          );
        });
      });

      it('preserves quotes that appear in the middle of content', async () => {
        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: 'Use "strict mode" configuration in TypeScript projects to ensure type safety.',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        const result = await standardSummaryService.createStandardSummary(
          standardVersionData,
          rules,
        );

        expect(result).toBe(
          'Use "strict mode" configuration in TypeScript projects to ensure type safety.',
        );
      });

      it('handles quotes with whitespace correctly', async () => {
        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: '  "Create comprehensive unit tests with Jest to ensure code quality."  ',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        const result = await standardSummaryService.createStandardSummary(
          standardVersionData,
          rules,
        );

        expect(result).toBe(
          'Create comprehensive unit tests with Jest to ensure code quality.',
        );
      });

      it('handles empty quotes correctly', async () => {
        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: '""',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        const result = await standardSummaryService.createStandardSummary(
          standardVersionData,
          rules,
        );

        expect(result).toBe('');
      });
    });

    describe('when standard has no scope defined', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(async () => {
        standardVersionData = standardVersionFactory({
          name: 'Global Standard',
          description: 'Applies to all files',
          scope: null,
        });

        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: 'Global standard summary',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        await standardSummaryService.createStandardSummary(
          standardVersionData,
          [],
        );
      });

      it('uses "Global scope" as default scope in prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain('**Scope:** Global scope');
      });
    });

    describe('when standard has no rules', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(async () => {
        standardVersionData = standardVersionFactory({
          name: 'Simple Standard',
          description: 'A standard without specific rules',
        });

        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: 'Simple standard summary',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        await standardSummaryService.createStandardSummary(
          standardVersionData,
          [],
        );
      });

      it('includes "No specific rules defined" in prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain('**Rules:**\nNo specific rules defined');
      });
    });

    describe('when standard has multiple rules', () => {
      let rules: Array<{ content: string; examples: RuleExample[] }>;

      beforeEach(async () => {
        const standardVersionData = standardVersionFactory();
        rules = [
          { content: 'First rule content', examples: [] },
          { content: 'Second rule content', examples: [] },
          { content: 'Third rule content', examples: [] },
        ];

        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: 'Multi-rule standard summary',
          attempts: 1,
          model: 'gpt-4o-mini',
        });

        await standardSummaryService.createStandardSummary(
          standardVersionData,
          rules,
        );
      });

      it('formats rules as bullet list in prompt', () => {
        const calledPrompt = mockAIService.executePrompt.mock.calls[0][0];
        expect(calledPrompt).toContain('* First rule content');
        expect(calledPrompt).toContain('* Second rule content');
        expect(calledPrompt).toContain('* Third rule content');
      });
    });

    describe('when AI service returns unsuccessful result', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(() => {
        standardVersionData = standardVersionFactory({
          name: 'Test Standard',
        });

        mockAIService.executePrompt.mockResolvedValue({
          success: false,
          data: null,
          error: 'API rate limit exceeded',
          attempts: 3,
          model: 'gpt-4o-mini',
        });
      });

      it('throws error with AI service error message', async () => {
        await expect(
          standardSummaryService.createStandardSummary(standardVersionData, []),
        ).rejects.toThrow(
          'Failed to generate standard summary: API rate limit exceeded',
        );
      });
    });

    describe('when AI service is not configured', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(() => {
        standardVersionData = standardVersionFactory({
          name: 'Test Standard',
        });

        mockAIService.isConfigured.mockResolvedValue(false);
      });

      it('throws AiNotConfigured error without calling executePrompt', async () => {
        await expect(
          standardSummaryService.createStandardSummary(standardVersionData, []),
        ).rejects.toThrow(AiNotConfigured);

        expect(mockAIService.isConfigured).toHaveBeenCalledTimes(1);
        expect(mockAIService.executePrompt).not.toHaveBeenCalled();
      });
    });

    describe('when AI service returns no data', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(() => {
        standardVersionData = standardVersionFactory({
          name: 'Test Standard',
        });

        mockAIService.executePrompt.mockResolvedValue({
          success: true,
          data: null,
          attempts: 1,
          model: 'gpt-4o-mini',
        });
      });

      it('throws error for missing data', async () => {
        await expect(
          standardSummaryService.createStandardSummary(standardVersionData, []),
        ).rejects.toThrow(
          'Failed to generate standard summary: Unknown AI service error',
        );
      });
    });

    describe('when AI service throws an exception', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(() => {
        standardVersionData = standardVersionFactory({
          name: 'Test Standard',
        });

        mockAIService.executePrompt.mockRejectedValue(
          new Error('Network connection failed'),
        );
      });

      it('propagates the underlying error', async () => {
        await expect(
          standardSummaryService.createStandardSummary(standardVersionData, []),
        ).rejects.toThrow('Network connection failed');
      });
    });

    describe('when AI service throws non-Error exception', () => {
      let standardVersionData: Omit<StandardVersion, 'id'>;

      beforeEach(() => {
        standardVersionData = standardVersionFactory({
          name: 'Test Standard',
        });

        mockAIService.executePrompt.mockRejectedValue('String error message');
      });

      it('handles non-Error exceptions', async () => {
        await expect(
          standardSummaryService.createStandardSummary(standardVersionData, []),
        ).rejects.toBe('String error message');
      });
    });
  });
});
