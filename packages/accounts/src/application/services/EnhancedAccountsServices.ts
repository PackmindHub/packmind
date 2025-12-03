import { UserService } from './UserService';
import { OrganizationService } from './OrganizationService';
import { InvitationService } from './InvitationService';
import { ApiKeyService } from './ApiKeyService';
import { LoginRateLimiterService } from './LoginRateLimiterService';
import { PasswordResetTokenService } from './PasswordResetTokenService';
import { IAccountsRepositories } from '../../domain/repositories/IAccountsRepositories';
import { ICliLoginCodeRepository } from '../../domain/repositories/ICliLoginCodeRepository';
import { PackmindLogger } from '@packmind/logger';
import { SmtpMailService } from '@packmind/node-utils';

/**
 * Enhanced AccountsServices that can accept an optional API key service
 * This allows external systems (like the API layer) to provide the API key service
 * with their own dependencies (like JWT service)
 */
export class EnhancedAccountsServices {
  private readonly userService: UserService;
  private readonly organizationService: OrganizationService;
  private readonly invitationService: InvitationService;
  private readonly passwordResetTokenService: PasswordResetTokenService;
  private readonly loginRateLimiterService: LoginRateLimiterService;
  private readonly apiKeyService?: ApiKeyService;

  constructor(
    private readonly accountsRepositories: IAccountsRepositories,
    private readonly logger: PackmindLogger,
    apiKeyService?: ApiKeyService,
  ) {
    // Initialize standard services
    this.userService = new UserService(
      this.accountsRepositories.getUserRepository(),
      this.accountsRepositories.getUserOrganizationMembershipRepository(),
    );
    this.organizationService = new OrganizationService(
      this.accountsRepositories.getOrganizationRepository(),
      this.logger,
    );
    this.invitationService = new InvitationService(
      this.accountsRepositories.getInvitationRepository(),
      new SmtpMailService(this.logger),
      this.logger,
    );
    this.passwordResetTokenService = new PasswordResetTokenService(
      this.accountsRepositories.getPasswordResetTokenRepository(),
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

  getPasswordResetTokenService(): PasswordResetTokenService {
    return this.passwordResetTokenService;
  }

  getCliLoginCodeRepository(): ICliLoginCodeRepository {
    return this.accountsRepositories.getCliLoginCodeRepository();
  }
}
