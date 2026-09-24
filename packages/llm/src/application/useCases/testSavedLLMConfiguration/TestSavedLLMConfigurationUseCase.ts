import { PackmindLogger } from '@packmind/logger';
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import {
  AIService,
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
import { IAIProviderRepository } from '../../../domain/repositories/IAIProviderRepository';
import { createLLMService } from '../../../factories/createLLMService';
import {
  classifyProviderError,
  extractProviderStatus,
} from '../../../infra/services/classifyProviderError';
import { isPackmindProviderAvailable } from '../utils';

const origin = 'TestSavedLLMConfigurationUseCase';

export class TestSavedLLMConfigurationUseCase
  extends AbstractAdminUseCase<
    TestSavedLLMConfigurationCommand,
    TestSavedLLMConfigurationResponse
  >
  implements ITestSavedLLMConfigurationUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly configurationRepository: IAIProviderRepository,
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
      return this.handleNoStoredConfiguration(organizationId);
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
   * With nothing stored, tests the Packmind provider instead when it is
   * available, so the caller still gets a real verdict rather than an error.
   */
  private async handleNoStoredConfiguration(
    organizationId: string,
  ): Promise<TestSavedLLMConfigurationResponse> {
    const packmindProviderAvailable = await isPackmindProviderAvailable();

    if (packmindProviderAvailable) {
      this.logger.info(
        'No configuration found, testing Packmind provider fallback',
        { organizationId },
      );

      const llmService = createLLMService({ provider: LLMProvider.PACKMIND });
      const standardModelResult = await this.testModel(
        llmService,
        LLMModelPerformance.STANDARD,
      );

      this.logger.info('Packmind provider fallback test completed', {
        organizationId,
        success: standardModelResult.success,
      });

      return {
        hasConfiguration: false,
        provider: LLMProvider.PACKMIND,
        standardModel: standardModelResult,
        overallSuccess: standardModelResult.success,
      };
    }

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
