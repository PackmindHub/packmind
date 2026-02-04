import { IUserRepository } from './IUserRepository';
import { IOrganizationRepository } from './IOrganizationRepository';
import { IInvitationRepository } from './IInvitationRepository';
import { IUserOrganizationMembershipRepository } from './IUserOrganizationMembershipRepository';
import { IPasswordResetTokenRepository } from './IPasswordResetTokenRepository';
import { ICliLoginCodeRepository } from './ICliLoginCodeRepository';
import { ITrialActivationRepository } from './ITrialActivationRepository';
import { IUserMetadataRepository } from './IUserMetadataRepository';

/**
 * IAccountsRepositories - Repository aggregator interface for the Accounts domain
 *
 * This interface serves as the main repository access point, aggregating all
 * individual repositories through getter methods. This pattern centralizes
 * repository instantiation and provides a clean dependency injection point.
 */
export interface IAccountsRepositories {
  /**
   * Get the user repository instance
   */
  getUserRepository(): IUserRepository;

  /**
   * Get the organization repository instance
   */
  getOrganizationRepository(): IOrganizationRepository;

  /**
   * Get the invitation repository instance
   */
  getInvitationRepository(): IInvitationRepository;

  /**
   * Get the user-organization membership repository instance
   */
  getUserOrganizationMembershipRepository(): IUserOrganizationMembershipRepository;

  /**
   * Get the password reset token repository instance
   */
  getPasswordResetTokenRepository(): IPasswordResetTokenRepository;

  /**
   * Get the CLI login code repository instance
   */
  getCliLoginCodeRepository(): ICliLoginCodeRepository;

  /**
   * Get the trial activation repository instance
   */
  getTrialActivationRepository(): ITrialActivationRepository;

  /**
   * Get the user metadata repository instance
   */
  getUserMetadataRepository(): IUserMetadataRepository;
}
