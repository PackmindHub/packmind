import { IUserRepository } from './IUserRepository';
import { IOrganizationRepository } from './IOrganizationRepository';

/**
 * IAccountsRepository - Repository aggregator interface for the Accounts domain
 *
 * This interface serves as the main repository access point, aggregating all
 * individual repositories through getter methods. This pattern centralizes
 * repository instantiation and provides a clean dependency injection point.
 */
export interface IAccountsRepository {
  /**
   * Get the user repository instance
   */
  getUserRepository(): IUserRepository;

  /**
   * Get the organization repository instance
   */
  getOrganizationRepository(): IOrganizationRepository;
}
