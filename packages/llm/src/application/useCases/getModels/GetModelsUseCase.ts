import {
  GetModelsCommand,
  GetModelsResponse,
  IGetModelsUseCase,
  IAccountsPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { createLLMService } from '../../../factories/createLLMService';
import {
  classifyProviderError,
  extractProviderStatus,
} from '../../../infra/services/classifyProviderError';

const origin = 'GetModelsUseCase';

export class GetModelsUseCase
  extends AbstractMemberUseCase<GetModelsCommand, GetModelsResponse>
  implements IGetModelsUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: GetModelsCommand & MemberContext,
  ): Promise<GetModelsResponse> {
    const { config } = command;

    this.logger.info('Getting available models', {
      provider: config.provider,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const llmService = createLLMService(config);
      const models = await llmService.getModels();

      this.logger.info('Successfully retrieved models', {
        provider: config.provider,
        count: models.length,
        organizationId: command.organizationId,
      });

      return {
        provider: config.provider,
        models,
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType = classifyProviderError(error);
      const statusCode = extractProviderStatus(error);

      this.logger.error('Failed to get models', {
        provider: config.provider,
        error: errorMessage,
        errorType,
        statusCode,
        organizationId: command.organizationId,
      });

      return {
        provider: config.provider,
        models: [],
        success: false,
        error: {
          message: errorMessage,
          type: errorType,
          statusCode,
        },
      };
    }
  }
}
