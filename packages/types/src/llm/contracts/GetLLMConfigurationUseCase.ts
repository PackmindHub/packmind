import { ISystemUseCase, SystemPackmindCommand } from '../../UseCase';
import { LLMProvider } from '../LLMServiceConfig';

export type GetLLMConfigurationCommand = SystemPackmindCommand;

/** For display: API keys and other secrets are stripped before this is built. */
export type LLMConfigurationDTO = {
  provider: LLMProvider;
  model: string;
  fastestModel: string;
  endpoint?: string; // For Azure/OpenAI-compatible
  apiVersion?: string; // For Azure
  // The stored API key cannot be decrypted and must be entered again.
  secretsUnreadable?: boolean;
};

export type GetLLMConfigurationResponse = {
  configuration: LLMConfigurationDTO | null;
  hasConfiguration: boolean;
};

export type IGetLLMConfigurationUseCase = ISystemUseCase<
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse
>;
