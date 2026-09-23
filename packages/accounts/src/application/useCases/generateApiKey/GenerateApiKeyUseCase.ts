import { PackmindLogger } from '@packmind/logger';
import {
  Configuration,
  removeTrailingSlash,
  UserNotInOrganizationError,
  UserNotFoundError,
} from '@packmind/node-utils';
import {
  IGenerateApiKeyUseCase,
  GenerateApiKeyCommand,
  GenerateApiKeyResponse,
} from '@packmind/types';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { ApiKeyService } from '../../services/ApiKeyService';
import {
  OrganizationNotFoundError,
  FailedToGenerateApiKeyError,
} from '../../../domain/errors';

const DEFAULT_APP_WEB_URL = 'http://localhost:8081';

const origin = 'GenerateApiKeyUseCase';

export class GenerateApiKeyUseCase implements IGenerateApiKeyUseCase {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly apiKeyService: ApiKeyService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GenerateApiKeyCommand,
  ): Promise<GenerateApiKeyResponse> {
    this.logger.info('Executing GenerateApiKeyUseCase', {
      userId: command.userId,
      organizationId: command.organizationId,
    });

    const user = await this.userService.getUserById(command.userId);
    if (!user) {
      throw new UserNotFoundError({ userId: command.userId });
    }

    const membership = user.memberships.find(
      (item) => item.organizationId === command.organizationId,
    );
    if (!membership) {
      throw new UserNotInOrganizationError({
        userId: command.userId,
        organizationId: command.organizationId,
      });
    }

    const organization = await this.organizationService.getOrganizationById(
      command.organizationId,
    );
    if (!organization) {
      throw new OrganizationNotFoundError(command.organizationId);
    }

    const host = await this.getApplicationUrl();

    const apiKey = this.apiKeyService.generateApiKey(
      user,
      organization,
      membership.role,
      host,
    );
    const expiresAt = this.apiKeyService.getApiKeyExpiration(apiKey);

    if (!expiresAt) {
      throw new FailedToGenerateApiKeyError();
    }

    this.logger.info('API key generated successfully', {
      userId: command.userId,
      expiresAt,
    });

    return {
      apiKey,
      expiresAt,
    };
  }

  private async getApplicationUrl(): Promise<string> {
    const configValue = await Configuration.getConfig('APP_WEB_URL');
    if (configValue) {
      return removeTrailingSlash(configValue);
    }
    this.logger.warn('Failed to get APP_WEB_URL value, using default', {
      configValue,
      default: DEFAULT_APP_WEB_URL,
    });
    return DEFAULT_APP_WEB_URL;
  }
}
