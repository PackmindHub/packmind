import { BaseHexa, HexaRegistry, PackmindLogger } from '@packmind/shared';
import { AccountsHexaFactory } from './AccountsHexaFactory';
import { User } from './domain/entities/User';
import { Organization } from './domain/entities/Organization';
import { ApiKeyService } from './application/services/ApiKeyService';

import {
  SignUpUserCommand,
  SignInUserCommand,
  GetUserByIdCommand,
  GetUserByUsernameCommand,
  ListUsersCommand,
  ValidatePasswordCommand,
  CreateOrganizationCommand,
  GetOrganizationByIdCommand,
  GetOrganizationByNameCommand,
  GetOrganizationBySlugCommand,
  ListOrganizationsCommand,
  GenerateUserTokenCommand,
  GenerateApiKeyCommand,
  GetCurrentApiKeyCommand,
} from './domain/useCases';

const origin = 'AccountsHexa';

/**
 * AccountsHexa - Facade for the Accounts domain following the new Hexa pattern.
 *
 * This class serves as the main entry point for accounts-related functionality.
 * It holds the AccountsHexa instance and exposes use cases as a clean facade.
 *
 * The Hexa pattern separates concerns:
 * - AccountsHexaFactory: Handles dependency injection and service instantiation
 * - AccountsHexa: Serves as use case facade and integration point with other domains
 *
 * Uses the DataSource provided through the HexaRegistry for database operations.
 */
export class AccountsHexa extends BaseHexa {
  private readonly hexa: AccountsHexaFactory;
  private readonly logger: PackmindLogger;

  constructor(
    registry: HexaRegistry,
    logger: PackmindLogger = new PackmindLogger(origin),
    apiKeyService?: ApiKeyService,
  ) {
    super(registry);

    this.logger = logger;
    this.logger.info('Initializing AccountsHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Initialize the hexagon with the shared DataSource and optional API key service
      this.hexa = new AccountsHexaFactory(
        dataSource,
        this.logger,
        apiKeyService,
      );
      this.logger.info('AccountsHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AccountsHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  destroy(): void {
    this.logger.info('Destroying AccountsHexa');
    // Add any cleanup logic here if needed
    this.logger.info('AccountsHexa destroyed');
  }

  // ========================================
  // USER USE CASES
  // ========================================

  /**
   * Sign up a new user with the given credentials and organization.
   */
  async signUpUser(command: SignUpUserCommand): Promise<User> {
    return this.hexa.useCases.signUpUser(command);
  }

  /**
   * Sign in a user with username and password.
   */
  async signInUser(command: SignInUserCommand) {
    return this.hexa.useCases.signInUser(command);
  }

  /**
   * Get a user by their ID.
   */
  async getUserById(command: GetUserByIdCommand): Promise<User | null> {
    return this.hexa.useCases.getUserById(command);
  }

  /**
   * Get a user by their username.
   */
  async getUserByUsername(
    command: GetUserByUsernameCommand,
  ): Promise<User | null> {
    return this.hexa.useCases.getUserByUsername(command);
  }

  /**
   * List all users in the system.
   */
  async listUsers(command: ListUsersCommand): Promise<User[]> {
    return this.hexa.useCases.listUsers(command);
  }

  /**
   * Validate a password against a hash.
   */
  async validatePassword(command: ValidatePasswordCommand): Promise<boolean> {
    return this.hexa.useCases.validatePassword(command);
  }

  // ========================================
  // ORGANIZATION USE CASES
  // ========================================

  /**
   * Create a new organization with the given name.
   */
  async createOrganization(
    command: CreateOrganizationCommand,
  ): Promise<Organization> {
    return this.hexa.useCases.createOrganization(command);
  }

  /**
   * Get an organization by its ID.
   */
  async getOrganizationById(
    command: GetOrganizationByIdCommand,
  ): Promise<Organization | null> {
    return this.hexa.useCases.getOrganizationById(command);
  }

  /**
   * Get an organization by its name.
   */
  async getOrganizationByName(
    command: GetOrganizationByNameCommand,
  ): Promise<Organization | null> {
    return this.hexa.useCases.getOrganizationByName(command);
  }

  /**
   * Get an organization by its slug.
   */
  async getOrganizationBySlug(
    command: GetOrganizationBySlugCommand,
  ): Promise<Organization | null> {
    return this.hexa.useCases.getOrganizationBySlug(command);
  }

  /**
   * List all organizations in the system.
   */
  async listOrganizations(
    command: ListOrganizationsCommand,
  ): Promise<Organization[]> {
    return this.hexa.useCases.listOrganizations(command);
  }

  /**
   * Generate user token data for authenticated user.
   */
  async generateUserToken(command: GenerateUserTokenCommand) {
    return this.hexa.useCases.generateUserToken(command);
  }

  // ========================================
  // API KEY USE CASES
  // ========================================

  /**
   * Generate a new API key for a user.
   */
  async generateApiKey(command: GenerateApiKeyCommand) {
    return this.hexa.useCases.generateApiKey(command);
  }

  /**
   * Get current API key information for a user.
   */
  async getCurrentApiKey(command: GetCurrentApiKeyCommand) {
    return this.hexa.useCases.getCurrentApiKey(command);
  }
}
