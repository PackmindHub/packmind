import { PackmindLogger } from '@packmind/logger';
import { Configuration, removeTrailingSlash } from '@packmind/node-utils';
import {
  IExchangeCliLoginCodeUseCase,
  ExchangeCliLoginCodeCommand,
  ExchangeCliLoginCodeResponse,
} from '@packmind/types';
import { ICliLoginCodeRepository } from '../../../domain/repositories/ICliLoginCodeRepository';
import { createCliLoginCodeToken } from '../../../domain/entities/CliLoginCode';
import {
  CliLoginCodeNotFoundError,
  CliLoginCodeExpiredError,
  CliLoginCodeUserNotFoundError,
  CliLoginCodeMembershipNotFoundError,
  CliLoginCodeOrganizationNotFoundError,
  CliLoginCodeApiKeyError,
} from '../../../domain/errors';
import { UserService } from '../../services/UserService';
import { OrganizationService } from '../../services/OrganizationService';
import { ApiKeyService } from '../../services/ApiKeyService';

const origin = 'ExchangeCliLoginCodeUseCase';
const DEFAULT_APP_WEB_URL = 'http://localhost:8081';

export class ExchangeCliLoginCodeUseCase implements IExchangeCliLoginCodeUseCase {
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
      return removeTrailingSlash(configValue);
    }
    return DEFAULT_APP_WEB_URL;
  }
}
