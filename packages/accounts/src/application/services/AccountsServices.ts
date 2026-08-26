import { UserService } from './UserService';
import { OrganizationService } from './OrganizationService';
import { InvitationService } from './InvitationService';
import { LoginRateLimiterService } from './LoginRateLimiterService';
import { PasswordResetTokenService } from './PasswordResetTokenService';
import { IAccountsRepositories } from '../../domain/repositories/IAccountsRepositories';
import { instrumentComponents, SmtpMailService } from '@packmind/node-utils';

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

  constructor(private readonly accountsRepositories: IAccountsRepositories) {
    // Initialize all services with their respective repositories from the aggregator
    this.userService = new UserService(
      this.accountsRepositories.getUserRepository(),
      this.accountsRepositories.getUserOrganizationMembershipRepository(),
    );
    this.organizationService = new OrganizationService(
      this.accountsRepositories.getOrganizationRepository(),
    );
    this.invitationService = new InvitationService(
      this.accountsRepositories.getInvitationRepository(),
      new SmtpMailService(),
    );
    this.loginRateLimiterService = new LoginRateLimiterService();
    this.passwordResetTokenService = new PasswordResetTokenService(
      this.accountsRepositories.getPasswordResetTokenRepository(),
      new SmtpMailService(),
    );

    // Services are where the domain logic that is not a query lives, and they
    // have no shared base class to hook - so the aggregator is the seam.
    instrumentComponents([
      this.userService,
      this.organizationService,
      this.invitationService,
      this.loginRateLimiterService,
      this.passwordResetTokenService,
    ]);
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
