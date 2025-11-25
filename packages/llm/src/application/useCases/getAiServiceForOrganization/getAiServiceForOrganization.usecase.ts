import {
  GetAiServiceForOrganizationCommand,
  GetAiServiceForOrganizationResponse,
  IGetAiServiceForOrganizationUseCase,
  LLMProvider,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { createLLMService } from '../../../factories/createLLMService';

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
    // Use PackmindService as the default provider for all SaaS users
    // PackmindService will delegate to the configured provider based on PACKMIND_DEFAULT_PROVIDER
    // Future: Will retrieve organization-specific LLM configuration from database
    this.logger.info('Getting AI service for organization', {
      organizationId: command.organizationId.toString(),
    });
    const aiService = createLLMService({ provider: LLMProvider.PACKMIND });

    return {
      aiService,
    };
  }
}
