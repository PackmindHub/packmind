import { Injectable, Inject } from '@nestjs/common';
import {
  ILlmPort,
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  GetModelsCommand,
  GetModelsResponse,
  PackmindCommandBody,
} from '@packmind/types';
import { LLM_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';
import { AuthService } from '../../auth/auth.service';
import { AuthenticatedRequest } from '@packmind/node-utils';

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
}
