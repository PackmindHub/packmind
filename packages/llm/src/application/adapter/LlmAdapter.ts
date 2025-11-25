import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import {
  AIService,
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
   * Currently no external ports are needed, but this allows for future extensibility
   * when organization-specific LLM configurations are stored in the database.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initialize(ports: Record<string, unknown>): Promise<void> {
    this.logger.info('Initializing LlmAdapter');
    // No external ports needed for initial implementation
    // Future: Retrieve IAccountsPort or IConfigPort when org-specific configs are added

    // Initialize use cases
    this._getAiServiceForOrganization = new GetAiServiceForOrganizationUseCase(
      this.logger,
    );
    this._testLLMConnection = new TestLLMConnectionUseCase(this.logger);
    this._getModels = new GetModelsUseCase(this.logger);

    this.logger.info('LlmAdapter initialized successfully');
  }

  /**
   * Check if adapter is ready.
   * Always returns true as no external dependencies are required initially.
   */
  public isReady(): boolean {
    return true;
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
