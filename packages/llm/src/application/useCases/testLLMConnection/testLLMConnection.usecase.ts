import {
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  ITestLLMConnectionUseCase,
  ModelTestResult,
  AIServiceErrorType,
  AIServiceErrorTypes,
  LLMModelPerformance,
  AIService,
  LLMServiceConfig,
  IAccountsPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { createLLMService } from '../../../factories/createLLMService';

const origin = 'TestLLMConnectionUseCase';

/**
 * Extract HTTP status code from SDK error objects.
 * This is a best-effort extraction - not all SDKs expose status codes reliably.
 */
function extractStatusCode(error: unknown): number | undefined {
  // All major SDK errors (OpenAI, Anthropic, Azure) expose a 'status' property
  if (error && typeof error === 'object' && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }

  // Fallback: parse from error message for backwards compatibility
  if (error instanceof Error) {
    const statusMatch = error.message.match(/\((\d{3})\)/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }
  }

  return undefined;
}

/**
 * Classify error type from error message.
 */
function classifyErrorType(error: unknown): AIServiceErrorType {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return AIServiceErrorTypes.RATE_LIMIT;
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return AIServiceErrorTypes.AUTHENTICATION_ERROR;
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
    return AIServiceErrorTypes.NETWORK_ERROR;
  }

  return AIServiceErrorTypes.API_ERROR;
}

export class TestLLMConnectionUseCase
  extends AbstractMemberUseCase<
    TestLLMConnectionCommand,
    TestLLMConnectionResponse
  >
  implements ITestLLMConnectionUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: TestLLMConnectionCommand & MemberContext,
  ): Promise<TestLLMConnectionResponse> {
    const { config } = command;

    this.logger.info('Testing LLM connection', {
      provider: config.provider,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    // Create the LLM service from the configuration
    const llmService = createLLMService(config);

    // Test standard model
    const standardModelResult = await this.testModel(
      llmService,
      LLMModelPerformance.STANDARD,
    );

    // Test fast model only if it differs from standard model
    let fastModelResult: ModelTestResult | undefined;
    const shouldTestFastModel = this.shouldTestFastModel(config);

    if (shouldTestFastModel) {
      fastModelResult = await this.testModel(
        llmService,
        LLMModelPerformance.FAST,
      );
    }

    const overallSuccess =
      standardModelResult.success &&
      (fastModelResult === undefined || fastModelResult.success);

    this.logger.info('LLM connection test completed', {
      provider: config.provider,
      standardModelSuccess: standardModelResult.success,
      fastModelSuccess: fastModelResult?.success,
      overallSuccess,
    });

    return {
      provider: config.provider,
      standardModel: standardModelResult,
      fastModel: fastModelResult,
      overallSuccess,
    };
  }

  /**
   * Test a specific model by executing a simple prompt.
   */
  private async testModel(
    llmService: AIService,
    performance: LLMModelPerformance,
  ): Promise<ModelTestResult> {
    try {
      const result = await llmService.executePrompt('Hello, how are you?', {
        performance,
        retryAttempts: 2, // Limited retry for quick feedback
      });

      if (result.success) {
        this.logger.info('Model test successful', {
          model: result.model,
          performance,
        });

        return {
          model: result.model,
          success: true,
        };
      } else {
        // Service returned graceful failure
        this.logger.warn('Model test failed gracefully', {
          model: result.model,
          error: result.error,
          performance,
        });

        return {
          model: result.model,
          success: false,
          error: {
            message: result.error || 'Unknown error',
            type: classifyErrorType(result.error),
            statusCode: undefined, // Graceful failures don't have status codes
          },
        };
      }
    } catch (error) {
      // Unexpected error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType = classifyErrorType(error);
      const statusCode = extractStatusCode(error);

      this.logger.error('Model test threw exception', {
        error: errorMessage,
        errorType,
        statusCode,
        performance,
      });

      return {
        model: 'unknown',
        success: false,
        error: {
          message: errorMessage,
          type: errorType,
          statusCode,
        },
      };
    }
  }

  /**
   * Determine if we should test the fast model separately.
   * Only test if it's defined and different from the standard model.
   */
  private shouldTestFastModel(config: LLMServiceConfig): boolean {
    // For Packmind provider, we don't test fast model separately
    if (config.provider === 'packmind') {
      return false;
    }

    // Check if fast model is defined and differs from standard model
    let fastModel: string | undefined;
    let standardModel: string | undefined;

    if ('fastestModel' in config) {
      fastModel = config.fastestModel;
    }
    if ('model' in config) {
      standardModel = config.model;
    }

    // If fast model is not defined or empty, don't test it
    if (!fastModel || fastModel.trim() === '') {
      return false;
    }

    // If models are the same, don't test separately
    if (fastModel === standardModel) {
      return false;
    }

    return true;
  }
}
