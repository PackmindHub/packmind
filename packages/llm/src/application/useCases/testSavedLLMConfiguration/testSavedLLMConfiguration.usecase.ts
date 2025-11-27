import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  AIService,
  AIServiceErrorType,
  AIServiceErrorTypes,
  IAccountsPort,
  ITestSavedLLMConfigurationUseCase,
  LLMModelPerformance,
  LLMProvider,
  LLMServiceConfig,
  ModelTestResult,
  OrganizationId,
  TestSavedLLMConfigurationCommand,
  TestSavedLLMConfigurationResponse,
} from '@packmind/types';
import { ILLMConfigurationRepository } from '../../../domain/repositories/ILLMConfigurationRepository';
import { createLLMService } from '../../../factories/createLLMService';

const origin = 'TestSavedLLMConfigurationUseCase';

/**
 * Extract HTTP status code from SDK error objects.
 * This is a best-effort extraction - not all SDKs expose status codes reliably.
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

export class TestSavedLLMConfigurationUseCase
  extends AbstractAdminUseCase<
    TestSavedLLMConfigurationCommand,
    TestSavedLLMConfigurationResponse
  >
  implements ITestSavedLLMConfigurationUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly configurationRepository: ILLMConfigurationRepository,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: TestSavedLLMConfigurationCommand & AdminContext,
  ): Promise<TestSavedLLMConfigurationResponse> {
    const { organizationId } = command;

    this.logger.info('Testing saved LLM configuration', {
      organizationId,
    });

    const storedConfig = await this.configurationRepository.get(
      organizationId as OrganizationId,
    );

    if (!storedConfig) {
      this.logger.info('No LLM configuration found', { organizationId });
      return {
        hasConfiguration: false,
        provider: LLMProvider.PACKMIND,
        standardModel: {
          model: 'unknown',
          success: false,
          error: {
            message: 'No LLM configuration found for this organization',
            type: AIServiceErrorTypes.API_ERROR,
          },
        },
        overallSuccess: false,
      };
    }

    const { config } = storedConfig;
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

    this.logger.info('Saved LLM configuration test completed', {
      organizationId,
      provider: config.provider,
      standardModelSuccess: standardModelResult.success,
      fastModelSuccess: fastModelResult?.success,
      overallSuccess,
    });

    return {
      hasConfiguration: true,
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
        retryAttempts: 2,
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
            statusCode: undefined,
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

  /**
   * Determine if we should test the fast model separately.
   * Only test if it's defined and different from the standard model.
   */
  private shouldTestFastModel(config: LLMServiceConfig): boolean {
    if (config.provider === LLMProvider.PACKMIND) {
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
