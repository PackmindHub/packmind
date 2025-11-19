import {
  GetAiServiceForOrganizationCommand,
  GetAiServiceForOrganizationResponse,
  IGetAiServiceForOrganizationUseCase,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { OpenAIService } from '../../../infra/services/OpenAIService';

const origin = 'GetAiServiceForOrganizationUseCase';

export class GetAiServiceForOrganizationUseCase
  implements IGetAiServiceForOrganizationUseCase
{
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetAiServiceForOrganizationCommand,
  ): Promise<GetAiServiceForOrganizationResponse> {
    // For now, always return a new OpenAIService instance with default config
    // Future: Will retrieve organization-specific LLM configuration
    this.logger.info('Getting AI service for organization', {
      organizationId: command.organizationId.toString(),
    });
    const aiService = new OpenAIService();

    return {
      aiService,
    };
  }
}
