import { IUseCase, PackmindCommand } from '../../UseCase';
import { AIServiceErrorType } from '../AIServiceTypes';
import { LLMProvider, LLMServiceConfig } from '../LLMServiceConfig';

export type GetModelsCommand = PackmindCommand & {
  config: LLMServiceConfig;
};

export type GetModelsResponse = {
  provider: LLMProvider;
  models: string[];
  success: boolean;
  error?: {
    message: string;
    type: AIServiceErrorType;
    statusCode?: number;
  };
};

export type IGetModelsUseCase = IUseCase<GetModelsCommand, GetModelsResponse>;
