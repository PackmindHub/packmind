import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { AuthService } from '../../auth/auth.service';
import { LLM_ADAPTER_TOKEN } from '../../shared/HexaRegistryModule';
import {
  ILlmPort,
  TestLLMConnectionCommand,
  TestLLMConnectionResponse,
  GetModelsCommand,
  GetModelsResponse,
  LLMProvider,
  createOrganizationId,
  PackmindCommandBody,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';

describe('LlmService', () => {
  let service: LlmService;
  let llmAdapter: jest.Mocked<ILlmPort>;
  let authService: jest.Mocked<AuthService>;

  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
    },
    organization: {
      id: createOrganizationId('org-123'),
      name: 'Test Org',
      slug: 'test-org',
      role: 'admin',
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: LLM_ADAPTER_TOKEN,
          useValue: {
            testLLMConnection: jest.fn(),
            getModels: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            makePackmindCommand: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    llmAdapter = module.get(LLM_ADAPTER_TOKEN);
    authService = module.get(AuthService);
  });

  describe('testConnection', () => {
    describe('with OpenAI config', () => {
      const body: PackmindCommandBody<TestLLMConnectionCommand> = {
        config: {
          provider: LLMProvider.OPENAI,
          apiKey: 'test-key',
          model: 'gpt-4',
        },
      };
      const command: TestLLMConnectionCommand = {
        userId: 'user-123',
        organizationId: createOrganizationId('org-123'),
        config: body.config,
      };
      const response: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: {
          model: 'gpt-4',
          success: true,
        },
        overallSuccess: true,
      };
      let result: TestLLMConnectionResponse;

      beforeEach(async () => {
        authService.makePackmindCommand.mockReturnValue(command);
        llmAdapter.testLLMConnection.mockResolvedValue(response);
        result = await service.testConnection(mockRequest, body);
      });

      it('creates packmind command from request', () => {
        expect(authService.makePackmindCommand).toHaveBeenCalledWith(
          mockRequest,
          body,
        );
      });

      it('calls adapter with command', () => {
        expect(llmAdapter.testLLMConnection).toHaveBeenCalledWith(command);
      });

      it('returns connection test response', () => {
        expect(result).toEqual(response);
      });
    });

    it('calls adapter with correct command for Anthropic', async () => {
      const body: PackmindCommandBody<TestLLMConnectionCommand> = {
        config: {
          provider: LLMProvider.ANTHROPIC,
          apiKey: 'test-key',
        },
      };

      const command: TestLLMConnectionCommand = {
        userId: 'user-123',
        organizationId: createOrganizationId('org-123'),
        config: body.config,
      };

      const response: TestLLMConnectionResponse = {
        provider: LLMProvider.ANTHROPIC,
        standardModel: {
          model: 'claude-3-opus-20240229',
          success: true,
        },
        overallSuccess: true,
      };

      authService.makePackmindCommand.mockReturnValue(command);
      llmAdapter.testLLMConnection.mockResolvedValue(response);

      const result = await service.testConnection(mockRequest, body);

      expect(result).toEqual(response);
    });
  });

  describe('getModels', () => {
    describe('with OpenAI config', () => {
      const body: PackmindCommandBody<GetModelsCommand> = {
        config: {
          provider: LLMProvider.OPENAI,
          apiKey: 'test-key',
        },
      };
      const command: GetModelsCommand = {
        userId: 'user-123',
        organizationId: createOrganizationId('org-123'),
        config: body.config,
      };
      const response: GetModelsResponse = {
        provider: LLMProvider.OPENAI,
        models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
        success: true,
      };
      let result: GetModelsResponse;

      beforeEach(async () => {
        authService.makePackmindCommand.mockReturnValue(command);
        llmAdapter.getModels.mockResolvedValue(response);
        result = await service.getModels(mockRequest, body);
      });

      it('creates packmind command from request', () => {
        expect(authService.makePackmindCommand).toHaveBeenCalledWith(
          mockRequest,
          body,
        );
      });

      it('calls adapter with command', () => {
        expect(llmAdapter.getModels).toHaveBeenCalledWith(command);
      });

      it('returns models response', () => {
        expect(result).toEqual(response);
      });
    });

    it('calls adapter with correct command for Gemini', async () => {
      const body: PackmindCommandBody<GetModelsCommand> = {
        config: {
          provider: LLMProvider.GEMINI,
          apiKey: 'test-key',
        },
      };

      const command: GetModelsCommand = {
        userId: 'user-123',
        organizationId: createOrganizationId('org-123'),
        config: body.config,
      };

      const response: GetModelsResponse = {
        provider: LLMProvider.GEMINI,
        models: ['gemini-pro', 'gemini-pro-vision'],
        success: true,
      };

      authService.makePackmindCommand.mockReturnValue(command);
      llmAdapter.getModels.mockResolvedValue(response);

      const result = await service.getModels(mockRequest, body);

      expect(result).toEqual(response);
    });
  });
});
