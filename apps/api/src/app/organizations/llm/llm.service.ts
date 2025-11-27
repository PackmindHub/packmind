import { Injectable, Inject } from '@nestjs/common';
import {
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse,
  GetModelsCommand,
  GetModelsResponse,
  ILlmPort,
  PackmindCommandBody,
  SaveLLMConfigurationCommand,
  SaveLLMConfigurationResponse,
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  TestSavedLLMConfigurationCommand,
  TestSavedLLMConfigurationResponse,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { AuthService } from '../../auth/auth.service';
import { LLM_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';

@Injectable()
export class LlmService {
  constructor(
    @Inject(LLM_ADAPTER_TOKEN)
    private readonly llmAdapter: ILlmPort,
    private readonly authService: AuthService,
  ) {}

  async testConnection(
    request: AuthenticatedRequest,
    body: PackmindCommandBody<TestLLMConnectionCommand>,
  ): Promise<TestLLMConnectionResponse> {
    const command: TestLLMConnectionCommand =
      this.authService.makePackmindCommand(request, body);

    return this.llmAdapter.testLLMConnection(command);
  }

  async getModels(
    request: AuthenticatedRequest,
    body: PackmindCommandBody<GetModelsCommand>,
  ): Promise<GetModelsResponse> {
    const command: GetModelsCommand = this.authService.makePackmindCommand(
      request,
      body,
    );

    return this.llmAdapter.getModels(command);
  }

  async saveConfiguration(
    request: AuthenticatedRequest,
    body: PackmindCommandBody<SaveLLMConfigurationCommand>,
  ): Promise<SaveLLMConfigurationResponse> {
    const command: SaveLLMConfigurationCommand =
      this.authService.makePackmindCommand(request, body);

    return this.llmAdapter.saveLLMConfiguration(command);
  }

  async getConfiguration(
    request: AuthenticatedRequest,
  ): Promise<GetLLMConfigurationResponse> {
    const command: GetLLMConfigurationCommand =
      this.authService.makePackmindCommand(request, {});

    return this.llmAdapter.getLLMConfiguration(command);
  }

  async testSavedConfiguration(
    request: AuthenticatedRequest,
  ): Promise<TestSavedLLMConfigurationResponse> {
    const command: TestSavedLLMConfigurationCommand =
      this.authService.makePackmindCommand(request, {});

    return this.llmAdapter.testSavedLLMConfiguration(command);
  }
}
