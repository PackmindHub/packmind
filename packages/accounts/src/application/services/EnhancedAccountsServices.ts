import { IAccountsServices } from '../IAccountsServices';
import { UserService } from './UserService';
import { OrganizationService } from './OrganizationService';
import { InvitationService } from './InvitationService';
import { ApiKeyService } from './ApiKeyService';
import { LoginRateLimiterService } from './LoginRateLimiterService';
import { IAccountsRepository } from '../../domain/repositories/IAccountsRepository';
import { PackmindLogger, SmtpMailService } from '@packmind/shared';

/**
 * Enhanced AccountsServices that can accept an optional API key service
 * This allows external systems (like the API layer) to provide the API key service
 * with their own dependencies (like JWT service)
 */
export class EnhancedAccountsServices implements IAccountsServices {
  private readonly userService: UserService;
  private readonly organizationService: OrganizationService;
  private readonly invitationService: InvitationService;
  private readonly loginRateLimiterService: LoginRateLimiterService;
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
    this.invitationService = new InvitationService(
      this.accountsRepository.getInvitationRepository(),
      new SmtpMailService(this.logger),
      this.logger,
    );
    this.loginRateLimiterService = new LoginRateLimiterService();

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

  getInvitationService(): InvitationService {
    return this.invitationService;
  }

  getApiKeyService(): ApiKeyService | undefined {
    return this.apiKeyService;
  }

  getLoginRateLimiterService(): LoginRateLimiterService {
    return this.loginRateLimiterService;
  }
}
