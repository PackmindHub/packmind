import {
  GetModelsCommand,
  GetModelsResponse,
  IGetModelsUseCase,
  AIServiceErrorType,
  AIServiceErrorTypes,
  IAccountsPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { createLLMService } from '../../../factories/createLLMService';

const origin = 'GetModelsUseCase';

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
      const errorType = classifyErrorType(error);
      const statusCode = extractStatusCode(error);

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
