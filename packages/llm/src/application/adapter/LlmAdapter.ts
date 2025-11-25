import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  AIService,
  IAccountsPort,
  IAccountsPortName,
  ILlmPort,
  OrganizationId,
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  GetModelsCommand,
  GetModelsResponse,
} from '@packmind/types';
import { GetAiServiceForOrganizationUseCase } from '../useCases/getAiServiceForOrganization/getAiServiceForOrganization.usecase';
import { TestLLMConnectionUseCase } from '../useCases/testLLMConnection/testLLMConnection.usecase';
import { GetModelsUseCase } from '../useCases/getModels/getModels.usecase';

const origin = 'LlmAdapter';

export class LlmAdapter implements IBaseAdapter<ILlmPort>, ILlmPort {
  // Ports
  private accountsPort?: IAccountsPort;

  // Use cases - created in initialize()
  private _getAiServiceForOrganization!: GetAiServiceForOrganizationUseCase;
  private _testLLMConnection!: TestLLMConnectionUseCase;
  private _getModels!: GetModelsUseCase;

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

    // Initialize use cases
    this._getAiServiceForOrganization = new GetAiServiceForOrganizationUseCase(
      this.logger,
    );
    this._testLLMConnection = new TestLLMConnectionUseCase(
      this.accountsPort,
      this.logger,
    );
    this._getModels = new GetModelsUseCase(this.accountsPort, this.logger);

    this.logger.info('LlmAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready.
   */
  public isReady(): boolean {
    return !!this.accountsPort;
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
    organizationId: OrganizationId,
  ): Promise<AIService> {
    this.logger.info('Getting LLM service for organization', {
      organizationId: organizationId.toString(),
    });

    const result = await this._getAiServiceForOrganization.execute({
      organizationId,
    });

    if (!result.aiService) {
      throw new Error(
        `Failed to get AI service for organization ${organizationId.toString()}`,
      );
    }

    return result.aiService;
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
}
