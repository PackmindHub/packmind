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

export class CliLoginCodeUserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`User not found for CLI login code: ${userId}`);
    this.name = 'CliLoginCodeUserNotFoundError';
  }
}

export class CliLoginCodeMembershipNotFoundError extends Error {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
  ) {
    super(`User ${userId} is not a member of organization ${organizationId}`);
    this.name = 'CliLoginCodeMembershipNotFoundError';
  }
}

export class CliLoginCodeOrganizationNotFoundError extends Error {
  constructor(public readonly organizationId: string) {
    super(`Organization not found for CLI login code: ${organizationId}`);
    this.name = 'CliLoginCodeOrganizationNotFoundError';
  }
}

export class CliLoginCodeApiKeyError extends Error {
  constructor() {
    super('Failed to generate API key or get expiration');
    this.name = 'CliLoginCodeApiKeyError';
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
  ) {}

  async execute(
    command: ExchangeCliLoginCodeCommand,
  ): Promise<ExchangeCliLoginCodeResponse> {
    const codeToken = createCliLoginCodeToken(command.code);
    const cliLoginCode =
      await this.cliLoginCodeRepository.findByCode(codeToken);

    if (!cliLoginCode) {
      throw new CliLoginCodeNotFoundError();
    }

    if (cliLoginCode.expiresAt < new Date()) {
      await this.cliLoginCodeRepository.delete(cliLoginCode.id);
      throw new CliLoginCodeExpiredError();
    }

    const user = await this.userService.getUserById(cliLoginCode.userId);
    if (!user) {
      throw new CliLoginCodeUserNotFoundError(cliLoginCode.userId);
    }

    const membership = user.memberships.find(
      (item) => item.organizationId === cliLoginCode.organizationId,
    );
    if (!membership) {
      throw new CliLoginCodeMembershipNotFoundError(
        cliLoginCode.userId,
        cliLoginCode.organizationId,
      );
    }

    const organization = await this.organizationService.getOrganizationById(
      cliLoginCode.organizationId,
    );
    if (!organization) {
      throw new CliLoginCodeOrganizationNotFoundError(
        cliLoginCode.organizationId,
      );
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
      throw new CliLoginCodeApiKeyError();
    }

    await this.cliLoginCodeRepository.delete(cliLoginCode.id);

    this.logger.info('CLI login code exchanged', {
      userId: cliLoginCode.userId,
      organizationId: cliLoginCode.organizationId,
    });

    return {
      apiKey,
      expiresAt,
    };
  }

  private async getApplicationUrl(): Promise<string> {
    const configValue = await Configuration.getConfig('APP_WEB_URL');
    if (configValue) {
      return configValue.endsWith('/') ? configValue.slice(0, -1) : configValue;
    }
    return DEFAULT_APP_WEB_URL;
  }
}
