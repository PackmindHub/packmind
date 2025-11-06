import { StandardVersion } from '../../domain/entities/StandardVersion';
import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  OpenAIService,
  AiNotConfigured,
} from '@packmind/node-utils';
import { RuleExample } from '@packmind/types';
import { createStandardSummaryPrompt } from './prompts/create_standard_summary';

const origin = 'StandardSummaryService';

export class StandardSummaryService {
  private readonly aiService: AIService;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    // Instantiate AIService directly inside the service for now
    // Later this will be injected when we have a clean AI adapter
    this.aiService = new OpenAIService();
  }

  public async createStandardSummary(
    standardVersionData: Omit<StandardVersion, 'id'>,
    rules: Array<{
      content: string;
      examples: RuleExample[];
    }>,
  ): Promise<string> {
    this.logger.info('Starting createStandardSummary process', {
      standardName: standardVersionData.name,
      version: standardVersionData.version,
      rulesCount: rules.length,
      scope: standardVersionData.scope,
    });

    // Check if AI service is configured before proceeding
    const isConfigured = await this.aiService.isConfigured();
    if (!isConfigured) {
      this.logger.warn(
        'AI service not configured - skipping standard summary generation',
        {
          standardName: standardVersionData.name,
          version: standardVersionData.version,
          rulesCount: rules.length,
          scope: standardVersionData.scope,
        },
      );
      throw new AiNotConfigured(
        'AI service not configured for standard summary generation',
      );
    }

    try {
      // Format rules for the prompt
      const rulesText =
        rules.length > 0
          ? rules.map((rule) => `* ${rule.content}`).join('---')
          : 'No specific rules defined';

      // Build the complete prompt by replacing placeholders
      const fullPrompt = createStandardSummaryPrompt
        .replace('{name}', standardVersionData.name)
        .replace('{description}', standardVersionData.description)
        .replace('{scope}', standardVersionData.scope || 'Global scope')
        .replace('{rules}', rulesText);

      this.logger.debug('Built AI prompt for standard summary', {
        promptLength: fullPrompt.length,
        descriptionLength: standardVersionData.description.length,
        rulesCount: rules.length,
      });

      // Execute the AI prompt to generate the summary
      const result = await this.aiService.executePrompt<string>(fullPrompt, {
        retryAttempts: 1, // Temporary while we put jobs in BG
      });

      if (!result.success || !result.data) {
        this.logger.error('AI service failed to generate standard summary', {
          error: result.error,
          attempts: result.attempts,
        });
        throw new Error(
          `Failed to generate standard summary: ${result.error || 'Unknown AI service error'}`,
        );
      }

      // Clean up the AI response by trimming whitespace and removing surrounding quotes
      let cleanedSummary = result.data.trim();
      if (cleanedSummary.startsWith('"') && cleanedSummary.endsWith('"')) {
        cleanedSummary = cleanedSummary.slice(1, -1);
      }

      this.logger.info('Standard summary generated successfully', {
        standardName: standardVersionData.name,
        summaryLength: cleanedSummary.length,
        attempts: result.attempts,
      });

      return cleanedSummary;
    } catch (error) {
      this.logger.error('Failed to create standard summary', {
        standardName: standardVersionData.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
