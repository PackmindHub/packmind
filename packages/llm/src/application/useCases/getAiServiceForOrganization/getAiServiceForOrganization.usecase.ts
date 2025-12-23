import {
  GetAiServiceForOrganizationCommand,
  GetAiServiceForOrganizationResponse,
  IGetAiServiceForOrganizationUseCase,
  LLMProvider,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { IAIProviderRepository } from '../../../domain/repositories/IAIProviderRepository';
import { createLLMService } from '../../../factories/createLLMService';
import { isPackmindProviderAvailable } from '../utils';

const origin = 'GetAiServiceForOrganizationUseCase';

export class GetAiServiceForOrganizationUseCase implements IGetAiServiceForOrganizationUseCase {
  constructor(
    private readonly configurationRepository: IAIProviderRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetAiServiceForOrganizationCommand,
  ): Promise<GetAiServiceForOrganizationResponse> {
    this.logger.info('Getting AI service for organization', {
      organizationId: command.organizationId.toString(),
    });

    const storedConfig = await this.configurationRepository.get(
      command.organizationId,
    );

    if (storedConfig) {
      if (
        storedConfig.config.provider === LLMProvider.PACKMIND &&
        !(await isPackmindProviderAvailable())
      ) {
        this.logger.info(
          'Packmind provider not available in OSS mode, returning undefined',
          {
            organizationId: command.organizationId.toString(),
          },
        );
        return { aiService: undefined };
      }

      this.logger.info('Using organization-specific LLM configuration', {
        organizationId: command.organizationId.toString(),
        provider: storedConfig.config.provider,
      });
      const aiService = createLLMService(storedConfig.config);
      return { aiService };
    }

    if (!(await isPackmindProviderAvailable())) {
      this.logger.info(
        'No configuration found and Packmind provider not available in OSS mode',
        {
          organizationId: command.organizationId.toString(),
        },
      );
      return { aiService: undefined };
    }

    this.logger.info(
      'No organization configuration found, using default Packmind provider',
      {
        organizationId: command.organizationId.toString(),
      },
    );
    const aiService = createLLMService({ provider: LLMProvider.PACKMIND });
    return { aiService };
  }
}
