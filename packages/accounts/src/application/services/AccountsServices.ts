import { UserService } from './UserService';
import { OrganizationService } from './OrganizationService';
import { InvitationService } from './InvitationService';
import { LoginRateLimiterService } from './LoginRateLimiterService';
import { PasswordResetTokenService } from './PasswordResetTokenService';
import { IAccountsRepositories } from '../../domain/repositories/IAccountsRepositories';
import { PackmindLogger } from '@packmind/logger';
import { SmtpMailService } from '@packmind/node-utils';

/**
 * AccountsServices - Service aggregator for the Accounts application layer
 *
 * This class serves as the main service access point, aggregating all
 * individual services. It handles the instantiation of services
 * using the repository aggregator and provides them through getter methods.
 */
export class AccountsServices {
  private readonly userService: UserService;
  private readonly organizationService: OrganizationService;
  private readonly invitationService: InvitationService;
  private readonly loginRateLimiterService: LoginRateLimiterService;
  private readonly passwordResetTokenService: PasswordResetTokenService;

  constructor(
    private readonly accountsRepositories: IAccountsRepositories,
    private readonly logger: PackmindLogger,
  ) {
    // Initialize all services with their respective repositories from the aggregator
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
    this.loginRateLimiterService = new LoginRateLimiterService();
    this.passwordResetTokenService = new PasswordResetTokenService(
      this.accountsRepositories.getPasswordResetTokenRepository(),
      new SmtpMailService(this.logger),
      this.logger,
    );
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

  getLoginRateLimiterService(): LoginRateLimiterService {
    return this.loginRateLimiterService;
  }

  getPasswordResetTokenService(): PasswordResetTokenService {
    return this.passwordResetTokenService;
  }
}
