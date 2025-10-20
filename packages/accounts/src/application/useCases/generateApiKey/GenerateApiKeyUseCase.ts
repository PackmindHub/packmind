import { PackmindLogger, Configuration } from '@packmind/shared';
import {
  IGenerateApiKeyUseCase,
  GenerateApiKeyCommand,
  GenerateApiKeyResponse,
} from '../../../domain/useCases/IGenerateApiKeyUseCase';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { ApiKeyService } from '../../services/ApiKeyService';

const DEFAULT_APP_WEB_URL = 'http://localhost:8081';

export class GenerateApiKeyUseCase implements IGenerateApiKeyUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly apiKeyService: ApiKeyService,
    private readonly logger: PackmindLogger,
  ) {}

  async execute(
    command: GenerateApiKeyCommand,
  ): Promise<GenerateApiKeyResponse> {
    this.logger.info('Executing GenerateApiKeyUseCase', {
      userId: command.userId,
      organizationId: command.organizationId,
    });

    try {
      // Get user and organization data
      const user = await this.userService.getUserById(command.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const membership = user.memberships.find(
        (item) => item.organizationId === command.organizationId,
      );
      if (!membership) {
        throw new Error('User organization membership not found');
      }

      const organization = await this.organizationService.getOrganizationById(
        command.organizationId,
      );
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Get host from configuration
      const host = await this.getApplicationUrl();

      // Generate API key using the service
      const apiKey = this.apiKeyService.generateApiKey(
        user,
        organization,
        membership.role,
        host,
      );
      const expiresAt = this.apiKeyService.getApiKeyExpiration(apiKey);

      if (!expiresAt) {
        throw new Error('Failed to get API key expiration');
      }

      this.logger.info('API key generated successfully', {
        userId: command.userId,
        expiresAt,
      });

      return {
        apiKey,
        expiresAt,
      };
    } catch (error) {
      this.logger.error('Failed to generate API key', {
        userId: command.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getApplicationUrl(): Promise<string> {
    const configValue = await Configuration.getConfig('APP_WEB_URL');
    if (configValue) {
      return configValue.endsWith('/') ? configValue.slice(0, -1) : configValue;
    }
    this.logger.warn('Failed to get APP_WEB_URL value, using default', {
      configValue,
      default: DEFAULT_APP_WEB_URL,
    });
    return DEFAULT_APP_WEB_URL;
  }
}
