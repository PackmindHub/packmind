import { Test, TestingModule } from '@nestjs/testing';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  TestLLMConnectionResponse,
  GetModelsResponse,
  LLMProvider,
  AIServiceErrorTypes,
  createOrganizationId,
  TestLLMConnectionCommand,
  GetModelsCommand,
  PackmindCommandBody,
} from '@packmind/types';

describe('LlmController', () => {
  let controller: LlmController;
  let service: LlmService;

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
      controllers: [LlmController],
      providers: [
        {
          provide: LlmService,
          useValue: {
            testConnection: jest.fn(),
            getModels: jest.fn(),
          },
        },
        {
          provide: PackmindLogger,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LlmController>(LlmController);
    service = module.get<LlmService>(LlmService);
  });

  describe('testConnection', () => {
    describe('with valid OpenAI config', () => {
      const body: PackmindCommandBody<TestLLMConnectionCommand> = {
        config: {
          provider: LLMProvider.OPENAI,
          apiKey: 'test-key',
          model: 'gpt-4',
        },
      };
      const expectedResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.OPENAI,
        standardModel: {
          model: 'gpt-4',
          success: true,
        },
        overallSuccess: true,
      };
      let result: TestLLMConnectionResponse;

      beforeEach(async () => {
        jest
          .spyOn(service, 'testConnection')
          .mockResolvedValue(expectedResponse);
        result = await controller.testConnection(
          createOrganizationId('org-123'),
          mockRequest,
          body,
        );
      });

      it('returns connection test results', () => {
        expect(result).toEqual(expectedResponse);
      });

      it('calls service.testConnection with correct params', () => {
        expect(service.testConnection).toHaveBeenCalledWith(mockRequest, body);
      });
    });

    it('returns connection test results with failures', async () => {
      const body: PackmindCommandBody<TestLLMConnectionCommand> = {
        config: {
          provider: LLMProvider.ANTHROPIC,
          apiKey: 'invalid-key',
        },
      };

      const expectedResponse: TestLLMConnectionResponse = {
        provider: LLMProvider.ANTHROPIC,
        standardModel: {
          model: 'claude-3-opus-20240229',
          success: false,
          error: {
            message: 'Authentication failed',
            type: AIServiceErrorTypes.AUTHENTICATION_ERROR,
            statusCode: 401,
          },
        },
        overallSuccess: false,
      };

      jest.spyOn(service, 'testConnection').mockResolvedValue(expectedResponse);

      const result = await controller.testConnection(
        createOrganizationId('org-123'),
        mockRequest,
        body,
      );

      expect(result).toEqual(expectedResponse);
    });

    describe('when service fails', () => {
      it('throws error', async () => {
        const body: PackmindCommandBody<TestLLMConnectionCommand> = {
          config: {
            provider: LLMProvider.OPENAI,
            apiKey: 'test-key',
          },
        };

        jest
          .spyOn(service, 'testConnection')
          .mockRejectedValue(new Error('Service unavailable'));

        await expect(
          controller.testConnection(
            createOrganizationId('org-123'),
            mockRequest,
            body,
          ),
        ).rejects.toThrow('Service unavailable');
      });
    });
  });

  describe('getModels', () => {
    describe('with valid OpenAI config', () => {
      const body: PackmindCommandBody<GetModelsCommand> = {
        config: {
          provider: LLMProvider.OPENAI,
          apiKey: 'test-key',
        },
      };
      const expectedResponse: GetModelsResponse = {
        provider: LLMProvider.OPENAI,
        models: ['gpt-4', 'gpt-3.5-turbo'],
        success: true,
      };
      let result: GetModelsResponse;

      beforeEach(async () => {
        jest.spyOn(service, 'getModels').mockResolvedValue(expectedResponse);
        result = await controller.getModels(
          createOrganizationId('org-123'),
          mockRequest,
          body,
        );
      });

      it('returns available models', () => {
        expect(result).toEqual(expectedResponse);
      });

      it('calls service.getModels with correct params', () => {
        expect(service.getModels).toHaveBeenCalledWith(mockRequest, body);
      });
    });

    describe('when models retrieval fails', () => {
      it('returns error response', async () => {
        const body: PackmindCommandBody<GetModelsCommand> = {
          config: {
            provider: LLMProvider.ANTHROPIC,
            apiKey: 'invalid-key',
          },
        };

        const expectedResponse: GetModelsResponse = {
          provider: LLMProvider.ANTHROPIC,
          models: [],
          success: false,
          error: {
            message: 'Authentication failed',
            type: AIServiceErrorTypes.AUTHENTICATION_ERROR,
            statusCode: 401,
          },
        };

        jest.spyOn(service, 'getModels').mockResolvedValue(expectedResponse);

        const result = await controller.getModels(
          createOrganizationId('org-123'),
          mockRequest,
          body,
        );

        expect(result).toEqual(expectedResponse);
      });
    });

    describe('when service fails', () => {
      it('throws error', async () => {
        const body: PackmindCommandBody<GetModelsCommand> = {
          config: {
            provider: LLMProvider.GEMINI,
            apiKey: 'test-key',
          },
        };

        jest
          .spyOn(service, 'getModels')
          .mockRejectedValue(new Error('Network error'));

        await expect(
          controller.getModels(
            createOrganizationId('org-123'),
            mockRequest,
            body,
          ),
        ).rejects.toThrow('Network error');
      });
    });
  });
});
