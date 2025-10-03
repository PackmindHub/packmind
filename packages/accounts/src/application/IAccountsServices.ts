import { UserService } from './services/UserService';
import { OrganizationService } from './services/OrganizationService';
import { ApiKeyService } from './services/ApiKeyService';
import { InvitationService } from './services/InvitationService';
import { LoginRateLimiterService } from './services/LoginRateLimiterService';
import { PasswordResetTokenService } from './services/PasswordResetTokenService';

/**
 * IAccountsServices - Service aggregator interface for the Accounts application layer
 *
 * This interface serves as the main service access point, aggregating all
 * individual services through getter methods. This pattern centralizes
 * service instantiation and provides a clean dependency injection point.
 */
export interface IAccountsServices {
  /**
   * Get the user service instance
   */
  getUserService(): UserService;

  /**
   * Get the organization service instance
   */
  getOrganizationService(): OrganizationService;

  /**
   * Get the invitation service instance
   */
  getInvitationService(): InvitationService;

  /**
   * Get the API key service instance (optional as it requires JWT dependencies)
   */
  getApiKeyService?(): ApiKeyService | undefined;

  /**
   * Get the login rate limiter service instance
   */
  getLoginRateLimiterService(): LoginRateLimiterService;

  /**
   * Get the password reset token service instance
   */
  getPasswordResetTokenService(): PasswordResetTokenService;
}
