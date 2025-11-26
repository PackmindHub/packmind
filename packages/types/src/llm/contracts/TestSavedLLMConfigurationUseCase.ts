import { IUseCase, PackmindCommand } from '../../UseCase';
import { TestLLMConnectionResponse } from './TestLLMConnectionUseCase';

export type TestSavedLLMConfigurationCommand = PackmindCommand;

export type TestSavedLLMConfigurationResponse = TestLLMConnectionResponse & {
  hasConfiguration: boolean;
};

export type ITestSavedLLMConfigurationUseCase = IUseCase<
  TestSavedLLMConfigurationCommand,
  TestSavedLLMConfigurationResponse
>;
