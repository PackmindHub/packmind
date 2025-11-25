import { IUseCase, PackmindCommand } from '../../UseCase';
import { AIServiceErrorType } from '../AIServiceTypes';
import { LLMProvider, LLMServiceConfig } from '../LLMServiceConfig';

export type TestLLMConnectionCommand = PackmindCommand & {
  config: LLMServiceConfig;
};

export type ModelTestResult = {
  model: string;
  success: boolean;
  error?: {
    message: string;
    type: AIServiceErrorType;
    statusCode?: number; // Optional, best-effort extraction from SDK
  };
};

export type TestLLMConnectionResponse = {
  provider: LLMProvider;
  standardModel: ModelTestResult;
  fastModel?: ModelTestResult; // Only if different from standard
  overallSuccess: boolean;
};

export type ITestLLMConnectionUseCase = IUseCase<
  TestLLMConnectionCommand,
  TestLLMConnectionResponse
>;
