import { PackmindLogger } from '@packmind/logger';
import { IBaseAdapter, instrumentUseCases } from '@packmind/node-utils';
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
import { DataSource } from 'typeorm';
import { LlmAdapterPortsMissingError } from '../../domain/errors';
import { IAIProviderRepository } from '../../domain/repositories/IAIProviderRepository';
import { AIProviderRepository } from '../../infra/repositories/AIProviderRepository';
import { AIProviderSchema } from '../../infra/schemas/AIProviderSchema';
import { GetAiServiceForOrganizationUseCase } from '../useCases/getAiServiceForOrganization/GetAiServiceForOrganizationUseCase';
import { GetLLMConfigurationUseCase } from '../useCases/getLLMConfiguration/GetLLMConfigurationUseCase';
import { GetModelsUseCase } from '../useCases/getModels/GetModelsUseCase';
import { SaveLLMConfigurationUseCase } from '../useCases/saveLLMConfiguration/SaveLLMConfigurationUseCase';
import { TestLLMConnectionUseCase } from '../useCases/testLLMConnection/TestLLMConnectionUseCase';
import { TestSavedLLMConfigurationUseCase } from '../useCases/testSavedLLMConfiguration/TestSavedLLMConfigurationUseCase';
import { GetAvailableProvidersUseCase } from '../useCases/getAvailableProviders/GetAvailableProvidersUseCase';

const origin = 'LlmAdapter';

export class LlmAdapter implements IBaseAdapter<ILlmPort>, ILlmPort {
  private accountsPort?: IAccountsPort;

  private aiProviderRepository: IAIProviderRepository | null = null;

  // Use cases - created in initialize()
  private _getAiServiceForOrganization!: GetAiServiceForOrganizationUseCase;
  private _testLLMConnection!: TestLLMConnectionUseCase;
  private _getModels!: GetModelsUseCase;
  private _saveLLMConfiguration!: SaveLLMConfigurationUseCase;
  private _getLLMConfiguration!: GetLLMConfigurationUseCase;
  private _testSavedLLMConfiguration!: TestSavedLLMConfigurationUseCase;
  private _getAvailableProviders!: GetAvailableProvidersUseCase;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('LlmAdapter constructed - awaiting initialization');
  }

  public async initialize(ports: {
    [IAccountsPortName]: IAccountsPort;
  }): Promise<void> {
    this.logger.info('Initializing LlmAdapter');

    this.accountsPort = ports[IAccountsPortName];

    if (!this.accountsPort) {
      throw new LlmAdapterPortsMissingError(['IAccountsPort']);
    }

    this.aiProviderRepository = new AIProviderRepository(
      this.dataSource.getRepository(AIProviderSchema),
    );

    this._getAiServiceForOrganization = new GetAiServiceForOrganizationUseCase(
      this.aiProviderRepository,
    );
    this._testLLMConnection = new TestLLMConnectionUseCase(this.accountsPort);
    this._getModels = new GetModelsUseCase(this.accountsPort);
    this._saveLLMConfiguration = new SaveLLMConfigurationUseCase(
      this.accountsPort,
      this.aiProviderRepository,
    );
    this._getLLMConfiguration = new GetLLMConfigurationUseCase(
      this.aiProviderRepository,
    );
    this._testSavedLLMConfiguration = new TestSavedLLMConfigurationUseCase(
      this.accountsPort,
      this.aiProviderRepository,
    );
    this._getAvailableProviders = new GetAvailableProvidersUseCase(
      this.accountsPort,
    );

    // Use cases have no base class to hook the way repositories and services
    // do, and this is where every one of the domain's use cases is built - see
    // docker/otel/README.md.
    instrumentUseCases(this);

    this.logger.info('LlmAdapter initialized successfully');
  }

  public isReady(): boolean {
    return !!this.accountsPort && !!this.aiProviderRepository;
  }

  public getPort(): ILlmPort {
    return this as ILlmPort;
  }

  async getLlmForOrganization(
    command: GetAiServiceForOrganizationCommand,
  ): Promise<GetAiServiceForOrganizationResponse> {
    this.logger.info('Getting LLM service for organization', {
      organizationId: command.organizationId.toString(),
    });

    return this._getAiServiceForOrganization.execute(command);
  }

  /**
   * Tests the fast model only when it differs from the standard one.
   */
  async testLLMConnection(
    command: TestLLMConnectionCommand,
  ): Promise<TestLLMConnectionResponse> {
    this.logger.info('Testing LLM connection', {
      provider: command.config.provider,
    });

    return this._testLLMConnection.execute(command);
  }

  async getModels(command: GetModelsCommand): Promise<GetModelsResponse> {
    this.logger.info('Getting available models', {
      provider: command.config.provider,
    });

    return this._getModels.execute(command);
  }

  /**
   * Requires the caller to be an organization admin.
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
   * Secrets are stripped from the returned configuration. With nothing stored,
   * falls back to the Packmind provider when that provider is available.
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
   * Requires the caller to be an organization admin.
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
   * The Packmind provider is excluded unless `PACKMIND_EDITION` is `proprietary`
   * and `PACKMIND_AI_PROVIDER_AVAILABLE` is `true`.
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
