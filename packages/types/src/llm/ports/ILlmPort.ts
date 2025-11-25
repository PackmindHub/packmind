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

export const ILlmPortName = 'ILlmPort' as const;

export interface ILlmPort {
  getLlmForOrganization(organizationId: OrganizationId): Promise<AIService>;
  testLLMConnection(
    command: TestLLMConnectionCommand,
  ): Promise<TestLLMConnectionResponse>;
  getModels(command: GetModelsCommand): Promise<GetModelsResponse>;
}
