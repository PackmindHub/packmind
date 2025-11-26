import { IUseCase, PackmindCommand } from '../../UseCase';
import { LLMServiceConfig } from '../LLMServiceConfig';

export type SaveLLMConfigurationCommand = PackmindCommand & {
  config: LLMServiceConfig;
};

export type SaveLLMConfigurationResponse = {
  success: boolean;
  message: string;
};

export type ISaveLLMConfigurationUseCase = IUseCase<
  SaveLLMConfigurationCommand,
  SaveLLMConfigurationResponse
>;
