import {
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  ITestLLMConnectionUseCase,
  ModelTestResult,
  AIServiceErrorTypes,
  LLMModelPerformance,
  AIService,
  LLMServiceConfig,
  IAccountsPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { createLLMService } from '../../../factories/createLLMService';
import {
  classifyProviderError,
  extractProviderStatus,
} from '../../../infra/services/classifyProviderError';

const origin = 'TestLLMConnectionUseCase';

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
            type: result.errorType ?? AIServiceErrorTypes.API_ERROR,
            statusCode: result.statusCode,
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType = classifyProviderError(error);
      const statusCode = extractProviderStatus(error);

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
