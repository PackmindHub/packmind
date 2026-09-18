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
 * Best-effort: the OpenAI and Anthropic SDKs put the HTTP status on the error
 * object, but not every provider error reaching here does, hence the fallback
 * to digging a `(4xx)` out of the message.
 */
function extractStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/\((\d{3})\)/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }
  }

  return undefined;
}

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

    const llmService = createLLMService(config);

    const standardModelResult = await this.testModel(
      llmService,
      LLMModelPerformance.STANDARD,
    );

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

  private shouldTestFastModel(config: LLMServiceConfig): boolean {
    if (config.provider === 'packmind') {
      return false;
    }

    let fastModel: string | undefined;
    let standardModel: string | undefined;

    if ('fastestModel' in config) {
      fastModel = config.fastestModel;
    }
    if ('model' in config) {
      standardModel = config.model;
    }

    if (!fastModel || fastModel.trim() === '') {
      return false;
    }

    if (fastModel === standardModel) {
      return false;
    }

    return true;
  }
}
