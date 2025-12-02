import { ISystemUseCase, SystemPackmindCommand } from '../../UseCase';
import { LLMProvider } from '../LLMServiceConfig';

export type GetLLMConfigurationCommand = SystemPackmindCommand;

/**
 * LLM Configuration DTO for display purposes.
 * Note: API keys and secrets are stripped from this response.
 */
export type LLMConfigurationDTO = {
  provider: LLMProvider;
  model: string;
  fastestModel: string;
  endpoint?: string; // For Azure/OpenAI-compatible
  apiVersion?: string; // For Azure
};

export type GetLLMConfigurationResponse = {
  configuration: LLMConfigurationDTO | null;
  hasConfiguration: boolean;
};

export type IGetLLMConfigurationUseCase = ISystemUseCase<
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse
>;
