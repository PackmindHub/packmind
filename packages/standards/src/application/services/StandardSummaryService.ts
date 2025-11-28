import {
  StandardVersion,
  OrganizationId,
  ILlmPort,
  AIService,
  AiNotConfigured,
  RuleExample,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { createStandardSummaryPrompt } from './prompts/create_standard_summary';

const origin = 'StandardSummaryService';

export class StandardSummaryService {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly llmPort?: ILlmPort,
  ) {}

  private async getAIService(
    organizationId: OrganizationId,
  ): Promise<AIService> {
    if (!this.llmPort) {
      throw new AiNotConfigured(
        'LLM port not configured for StandardSummaryService',
      );
    }
    const response = await this.llmPort.getLlmForOrganization({
      organizationId,
    });
    if (!response.aiService) {
      this.logger.warn(
        'AI service not available - skipping summary generation',
        {
          organizationId: organizationId.toString(),
        },
      );
      throw new AiNotConfigured(
        'AI service not available for StandardSummaryService',
      );
    }
    return response.aiService;
  }

  public async createStandardSummary(
    organizationId: OrganizationId,
    standardVersionData: Omit<StandardVersion, 'id'>,
    rules: Array<{
      content: string;
      examples: RuleExample[];
    }>,
  ): Promise<string> {
    this.logger.info('Starting createStandardSummary process', {
      organizationId: organizationId.toString(),
      standardName: standardVersionData.name,
      version: standardVersionData.version,
      rulesCount: rules.length,
      scope: standardVersionData.scope,
    });

    // Get AI service for the organization
    const aiService = await this.getAIService(organizationId);

    // Check if AI service is configured before proceeding
    const isConfigured = await aiService.isConfigured();
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
      const result = await aiService.executePrompt<string>(fullPrompt, {
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
