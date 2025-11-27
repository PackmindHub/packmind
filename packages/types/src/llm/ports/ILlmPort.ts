import { AIService } from '../AIService';
import { OrganizationId } from '../../accounts/Organization';
import {
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
} from '../contracts/TestLLMConnectionUseCase';
import {
  GetModelsCommand,
  GetModelsResponse,
} from '../contracts/GetModelsUseCase';
import {
  GetLLMConfigurationCommand,
  GetLLMConfigurationResponse,
} from '../contracts/GetLLMConfigurationUseCase';
import {
  SaveLLMConfigurationCommand,
  SaveLLMConfigurationResponse,
} from '../contracts/SaveLLMConfigurationUseCase';
import {
  TestSavedLLMConfigurationCommand,
  TestSavedLLMConfigurationResponse,
} from '../contracts/TestSavedLLMConfigurationUseCase';
import {
  GetAvailableProvidersCommand,
  GetAvailableProvidersResponse,
} from '../contracts/GetAvailableProvidersUseCase';

export const ILlmPortName = 'ILlmPort' as const;

export interface ILlmPort {
  getLlmForOrganization(organizationId: OrganizationId): Promise<AIService>;
  testLLMConnection(
    command: TestLLMConnectionCommand,
  ): Promise<TestLLMConnectionResponse>;
  getModels(command: GetModelsCommand): Promise<GetModelsResponse>;
  saveLLMConfiguration(
    command: SaveLLMConfigurationCommand,
  ): Promise<SaveLLMConfigurationResponse>;
  getLLMConfiguration(
    command: GetLLMConfigurationCommand,
  ): Promise<GetLLMConfigurationResponse>;
  testSavedLLMConfiguration(
    command: TestSavedLLMConfigurationCommand,
  ): Promise<TestSavedLLMConfigurationResponse>;
  getAvailableProviders(
    command: GetAvailableProvidersCommand,
  ): Promise<GetAvailableProvidersResponse>;
}
