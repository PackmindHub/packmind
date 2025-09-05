import { IAccountsServices } from '../IAccountsServices';
import { UserService } from './UserService';
import { OrganizationService } from './OrganizationService';
import { ApiKeyService } from './ApiKeyService';
import { IAccountsRepository } from '../../domain/repositories/IAccountsRepository';
import { PackmindLogger } from '@packmind/shared';

/**
 * Enhanced AccountsServices that can accept an optional API key service
 * This allows external systems (like the API layer) to provide the API key service
 * with their own dependencies (like JWT service)
 */
export class EnhancedAccountsServices implements IAccountsServices {
  private readonly userService: UserService;
  private readonly organizationService: OrganizationService;
  private readonly apiKeyService?: ApiKeyService;

  constructor(
    private readonly accountsRepository: IAccountsRepository,
    private readonly logger: PackmindLogger,
    apiKeyService?: ApiKeyService,
  ) {
    // Initialize standard services
    this.userService = new UserService(
      this.accountsRepository.getUserRepository(),
      this.logger,
    );
    this.organizationService = new OrganizationService(
      this.accountsRepository.getOrganizationRepository(),
      this.logger,
    );

    // Store optional API key service if provided
    this.apiKeyService = apiKeyService;

    this.logger.info('EnhancedAccountsServices initialized', {
      hasApiKeyService: !!this.apiKeyService,
    });
  }

  getUserService(): UserService {
    return this.userService;
  }

  getOrganizationService(): OrganizationService {
    return this.organizationService;
  }

  getApiKeyService(): ApiKeyService | undefined {
    return this.apiKeyService;
  }
}
