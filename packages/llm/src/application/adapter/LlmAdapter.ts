import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter } from '@packmind/node-utils';
import { AIService, ILlmPort, OrganizationId } from '@packmind/types';
import { GetAiServiceForOrganizationUseCase } from '../useCases/getAiServiceForOrganization/getAiServiceForOrganization.usecase';

const origin = 'LlmAdapter';

export class LlmAdapter implements IBaseAdapter<ILlmPort>, ILlmPort {
  // Use case - created in initialize()
  private _getAiServiceForOrganization!: GetAiServiceForOrganizationUseCase;

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

    // Initialize use case
    this._getAiServiceForOrganization = new GetAiServiceForOrganizationUseCase(
      this.logger,
    );

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
}
