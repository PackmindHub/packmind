import { UserService } from './services/UserService';
import { OrganizationService } from './services/OrganizationService';
import { ApiKeyService } from './services/ApiKeyService';

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
   * Get the API key service instance (optional as it requires JWT dependencies)
   */
  getApiKeyService?(): ApiKeyService | undefined;
}
