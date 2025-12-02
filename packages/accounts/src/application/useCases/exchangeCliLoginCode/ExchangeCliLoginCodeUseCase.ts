import { PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import {
  IExchangeCliLoginCodeUseCase,
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse,
} from '@packmind/types';
import { ICliLoginCodeRepository } from '../../../domain/repositories/ICliLoginCodeRepository';
import { createCliLoginCodeToken } from '../../../domain/entities/CliLoginCode';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { ApiKeyService } from '../../services/ApiKeyService';

const origin = 'ExchangeCliLoginCodeUseCase';
const DEFAULT_APP_WEB_URL = 'http://localhost:8081';

export class CliLoginCodeNotFoundError extends Error {
  constructor() {
    super('CLI login code not found or invalid');
    this.name = 'CliLoginCodeNotFoundError';
  }
}

export class CliLoginCodeExpiredError extends Error {
  constructor() {
    super('CLI login code has expired');
    this.name = 'CliLoginCodeExpiredError';
  }
}

export class ExchangeCliLoginCodeUseCase
  implements IExchangeCliLoginCodeUseCase
{
  constructor(
    private readonly cliLoginCodeRepository: ICliLoginCodeRepository,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly apiKeyService: ApiKeyService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('ExchangeCliLoginCodeUseCase initialized');
  }

  async execute(
    command: ExchangeCliLoginCodeCommand,
  ): Promise<ExchangeCliLoginCodeResponse> {
    this.logger.info('Executing ExchangeCliLoginCodeUseCase', {
      code: this.maskCode(command.code),
    });

    try {
      // 1. Find the CLI login code
      const codeToken = createCliLoginCodeToken(command.code);
      const cliLoginCode =
        await this.cliLoginCodeRepository.findByCode(codeToken);

      if (!cliLoginCode) {
        this.logger.warn('CLI login code not found', {
          code: this.maskCode(command.code),
        });
        throw new CliLoginCodeNotFoundError();
      }

      // 2. Check if the code has expired
      const now = new Date();
      if (cliLoginCode.expiresAt < now) {
        this.logger.warn('CLI login code has expired', {
          code: this.maskCode(command.code),
          expiresAt: cliLoginCode.expiresAt.toISOString(),
        });
        // Delete the expired code
        await this.cliLoginCodeRepository.delete(cliLoginCode.id);
        throw new CliLoginCodeExpiredError();
      }

      // 3. Get user and organization data
      const user = await this.userService.getUserById(cliLoginCode.userId);
      if (!user) {
        this.logger.error('User not found for CLI login code', {
          userId: cliLoginCode.userId,
        });
        throw new Error('User not found');
      }

      const membership = user.memberships.find(
        (item) => item.organizationId === cliLoginCode.organizationId,
      );
      if (!membership) {
        this.logger.error('User organization membership not found', {
          userId: cliLoginCode.userId,
          organizationId: cliLoginCode.organizationId,
        });
        throw new Error('User organization membership not found');
      }

      const organization = await this.organizationService.getOrganizationById(
        cliLoginCode.organizationId,
      );
      if (!organization) {
        this.logger.error('Organization not found for CLI login code', {
          organizationId: cliLoginCode.organizationId,
        });
        throw new Error('Organization not found');
      }

      // 4. Generate API key
      const host = await this.getApplicationUrl();
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

      // 5. Delete the CLI login code (one-time use)
      await this.cliLoginCodeRepository.delete(cliLoginCode.id);

      this.logger.info('CLI login code exchanged successfully', {
        userId: cliLoginCode.userId,
        organizationId: cliLoginCode.organizationId,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        apiKey,
        expiresAt,
      };
    } catch (error) {
      if (
        error instanceof CliLoginCodeNotFoundError ||
        error instanceof CliLoginCodeExpiredError
      ) {
        throw error;
      }

      this.logger.error('Failed to exchange CLI login code', {
        code: this.maskCode(command.code),
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

  private maskCode(code: string): string {
    if (code.length <= 4) {
      return '****';
    }
    return `${code.slice(0, 2)}****${code.slice(-2)}`;
  }
}
