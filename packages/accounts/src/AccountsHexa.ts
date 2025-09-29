import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindLogger,
} from '@packmind/shared';
import { AccountsHexaFactory } from './AccountsHexaFactory';
import { User } from './domain/entities/User';
import { Organization } from './domain/entities/Organization';
import { ApiKeyService } from './application/services/ApiKeyService';

import {
  SignUpWithOrganizationCommand,
  SignInUserCommand,
  GetUserByIdCommand,
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
  CreateInvitationsCommand,
  CreateInvitationsResponse,
  ListUsersResponse,
  SignUpWithOrganizationResponse,
  ListOrganizationUserStatusesCommand,
  ListOrganizationUserStatusesResponse,
} from './domain/useCases';
import {
  CheckEmailAvailabilityCommand,
  CheckEmailAvailabilityResponse,
  ActivateUserAccountCommand,
  ActivateUserAccountResponse,
} from '@packmind/shared';

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
export type AccountsHexaOpts = BaseHexaOpts & {
  apiKeyService?: ApiKeyService;
};

const baseAccountsHexaOpts = { logger: new PackmindLogger(origin) };

export class AccountsHexa extends BaseHexa<AccountsHexaOpts> {
  private readonly hexa: AccountsHexaFactory;

  constructor(registry: HexaRegistry, opts?: Partial<AccountsHexaOpts>) {
    super(registry, { ...baseAccountsHexaOpts, ...opts });
    this.logger.info('Initializing AccountsHexa');

    try {
      // Get the DataSource from the registry
      const dataSource = registry.getDataSource();
      this.logger.debug('Retrieved DataSource from registry');

      // Initialize the hexagon with the shared DataSource and optional API key service
      this.hexa = new AccountsHexaFactory(
        dataSource,
        this.logger,
        opts?.apiKeyService,
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
   * Sign up a new user and create their organization in a single operation.
   */
  async signUpWithOrganization(
    command: SignUpWithOrganizationCommand,
  ): Promise<SignUpWithOrganizationResponse> {
    return this.hexa.useCases.signUpWithOrganization(command);
  }

  /**
   * Sign in a user with email and password.
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
   * List users (internal use only - not a public use case).
   * @internal
   */
  async listUsers(command: ListUsersCommand): Promise<ListUsersResponse> {
    return this.hexa.useCases.listUsers(command);
  }

  /**
   * Validate a password against a hash.
   */
  async validatePassword(command: ValidatePasswordCommand): Promise<boolean> {
    return this.hexa.useCases.validatePassword(command);
  }

  /**
   * Check if an email address is available for registration.
   */
  async checkEmailAvailability(
    command: CheckEmailAvailabilityCommand,
  ): Promise<CheckEmailAvailabilityResponse> {
    return this.hexa.useCases.checkEmailAvailability(command);
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
   * Get an organization by its name (will slugify internally).
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

  async createInvitations(
    command: CreateInvitationsCommand,
  ): Promise<CreateInvitationsResponse> {
    return this.hexa.useCases.createInvitations(command);
  }

  /**
   * List organization users with their statuses (admin only).
   */
  async listOrganizationUserStatuses(
    command: ListOrganizationUserStatusesCommand,
  ): Promise<ListOrganizationUserStatusesResponse> {
    return this.hexa.useCases.listOrganizationUserStatuses(command);
  }

  /**
   * Activate a user account using an invitation token and password.
   */
  async activateUserAccount(
    command: ActivateUserAccountCommand,
  ): Promise<ActivateUserAccountResponse> {
    return this.hexa.useCases.activateUserAccount(command);
  }

  /**
   * Validate an invitation token and return email and validity status.
   */
  async validateInvitationToken(command: {
    token: string;
  }): Promise<{ email: string; isValid: boolean }> {
    return this.hexa.useCases.validateInvitationToken(command);
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
