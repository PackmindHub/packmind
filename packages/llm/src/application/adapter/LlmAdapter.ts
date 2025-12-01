import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  ILlmPort,
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  GetModelsCommand,
  GetModelsResponse,
  SaveLLMConfigurationCommand,
  SaveLLMConfigurationResponse,
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse,
  TestSavedLLMConfigurationCommand,
  TestSavedLLMConfigurationResponse,
  GetAvailableProvidersCommand,
  GetAvailableProvidersResponse,
  GetAiServiceForOrganizationCommand,
  GetAiServiceForOrganizationResponse,
} from '@packmind/types';
import { ILLMConfigurationRepository } from '../../domain/repositories/ILLMConfigurationRepository';
import { LLMConfigurationRepositoryCache } from '../../infra/repositories/LLMConfigurationRepositoryCache';
import { GetAiServiceForOrganizationUseCase } from '../useCases/getAiServiceForOrganization/getAiServiceForOrganization.usecase';
import { GetLLMConfigurationUseCase } from '../useCases/getLLMConfiguration/getLLMConfiguration.usecase';
import { GetModelsUseCase } from '../useCases/getModels/getModels.usecase';
import { SaveLLMConfigurationUseCase } from '../useCases/saveLLMConfiguration/saveLLMConfiguration.usecase';
import { TestLLMConnectionUseCase } from '../useCases/testLLMConnection/testLLMConnection.usecase';
import { TestSavedLLMConfigurationUseCase } from '../useCases/testSavedLLMConfiguration/testSavedLLMConfiguration.usecase';
import { GetAvailableProvidersUseCase } from '../useCases/getAvailableProviders/getAvailableProviders.usecase';

const origin = 'LlmAdapter';

export class LlmAdapter implements IBaseAdapter<ILlmPort>, ILlmPort {
  // Ports
  private accountsPort?: IAccountsPort;

  // Repositories
  private llmConfigurationRepository: ILLMConfigurationRepository | null = null;

  // Use cases - created in initialize()
  private _getAiServiceForOrganization!: GetAiServiceForOrganizationUseCase;
  private _testLLMConnection!: TestLLMConnectionUseCase;
  private _getModels!: GetModelsUseCase;
  private _saveLLMConfiguration!: SaveLLMConfigurationUseCase;
  private _getLLMConfiguration!: GetLLMConfigurationUseCase;
  private _testSavedLLMConfiguration!: TestSavedLLMConfigurationUseCase;
  private _getAvailableProviders!: GetAvailableProvidersUseCase;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('LlmAdapter constructed - awaiting initialization');
  }

  /**
   * Initialize adapter with ports from registry.
   */
  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
  }): Promise<void> {
    this.logger.info('Initializing LlmAdapter');

    // Set accounts port
    this.accountsPort = ports[IAccountsPortName];

    if (!this.accountsPort) {
      throw new Error(
        'IAccountsPort is required for LlmAdapter initialization',
      );
    }

    // Initialize repository
    this.llmConfigurationRepository = new LLMConfigurationRepositoryCache();

    // Initialize use cases
    this._getAiServiceForOrganization = new GetAiServiceForOrganizationUseCase(
      this.llmConfigurationRepository,
      this.logger,
    );
    this._testLLMConnection = new TestLLMConnectionUseCase(
      this.accountsPort,
      this.logger,
    );
    this._getModels = new GetModelsUseCase(this.accountsPort, this.logger);
    this._saveLLMConfiguration = new SaveLLMConfigurationUseCase(
      this.accountsPort,
      this.llmConfigurationRepository,
      this.logger,
    );
    this._getLLMConfiguration = new GetLLMConfigurationUseCase(
      this.llmConfigurationRepository,
      this.logger,
    );
    this._testSavedLLMConfiguration = new TestSavedLLMConfigurationUseCase(
      this.accountsPort,
      this.llmConfigurationRepository,
      this.logger,
    );
    this._getAvailableProviders = new GetAvailableProvidersUseCase(
      this.accountsPort,
      this.logger,
    );

    this.logger.info('LlmAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready.
   */
  public isReady(): boolean {
    return !!this.accountsPort && !!this.llmConfigurationRepository;
  }

  /**
   * Get the port interface this adapter implements.
   */
  public getPort(): ILlmPort {
    return this as ILlmPort;
  }

  // ===========================
  // ILlmPort Implementation
  // ===========================

  /**
   * Get an LLM service instance for the specified organization.
   * Uses the GetAiServiceForOrganizationUseCase to retrieve the service.
   * Future: Will retrieve organization-specific LLM configuration from database.
   */
  async getLlmForOrganization(
    command: GetAiServiceForOrganizationCommand,
  ): Promise<GetAiServiceForOrganizationResponse> {
    this.logger.info('Getting LLM service for organization', {
      organizationId: command.organizationId.toString(),
    });

    return this._getAiServiceForOrganization.execute(command);
  }

  /**
   * Test an LLM connection configuration.
   * Executes a simple prompt against both standard and fast models (if different).
   */
  async testLLMConnection(
    command: TestLLMConnectionCommand,
  ): Promise<TestLLMConnectionResponse> {
    this.logger.info('Testing LLM connection', {
      provider: command.config.provider,
    });

    return this._testLLMConnection.execute(command);
  }

  /**
   * Get available models for an LLM provider.
   * Returns a list of model IDs that can be used to configure the LLM.
   */
  async getModels(command: GetModelsCommand): Promise<GetModelsResponse> {
    this.logger.info('Getting available models', {
      provider: command.config.provider,
    });

    return this._getModels.execute(command);
  }

  /**
   * Save LLM configuration for an organization.
   * Requires admin privileges.
   */
  async saveLLMConfiguration(
    command: SaveLLMConfigurationCommand,
  ): Promise<SaveLLMConfigurationResponse> {
    this.logger.info('Saving LLM configuration', {
      organizationId: command.organizationId,
      provider: command.config.provider,
    });

    return this._saveLLMConfiguration.execute(command);
  }

  /**
   * Get LLM configuration for an organization.
   * Returns configuration without secrets.
   * Falls back to Packmind provider if no configuration exists and in proprietary cloud.
   */
  async getLLMConfiguration(
    command: GetLLMConfigurationCommand,
  ): Promise<GetLLMConfigurationResponse> {
    this.logger.info('Getting LLM configuration', {
      organizationId: command.organizationId,
    });

    return this._getLLMConfiguration.execute(command);
  }

  /**
   * Test the saved LLM configuration for an organization.
   * Requires admin privileges.
   */
  async testSavedLLMConfiguration(
    command: TestSavedLLMConfigurationCommand,
  ): Promise<TestSavedLLMConfigurationResponse> {
    this.logger.info('Testing saved LLM configuration', {
      organizationId: command.organizationId,
    });

    return this._testSavedLLMConfiguration.execute(command);
  }

  /**
   * Get available LLM providers.
   * Filters providers based on deployment edition (OSS excludes Packmind provider).
   */
  async getAvailableProviders(
    command: GetAvailableProvidersCommand,
  ): Promise<GetAvailableProvidersResponse> {
    this.logger.info('Getting available providers', {
      organizationId: command.organizationId,
    });

    return this._getAvailableProviders.execute(command);
  }
}
