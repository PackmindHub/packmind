import { CommandSummaryService } from './CommandSummaryService';
import { PackmindLogger } from '@packmind/logger';
import {
  AIService,
  AIPromptResult,
  AiNotConfigured,
  ILlmPort,
  CommandVersion,
  createOrganizationId,
} from '@packmind/types';
import { createCommandSummaryPrompt } from './cookbook/prompts/create_command_summary';
import { stubLogger } from '@packmind/test-utils';
import { commandVersionFactory } from '../../../test/commandVersionFactory';
import { v4 as uuidv4 } from 'uuid';

describe('RecipeSummaryService', () => {
  let commandSummaryService: CommandSummaryService;
  let mockLogger: jest.Mocked<PackmindLogger>;
  let mockAIService: jest.Mocked<AIService>;
  let mockLlmPort: jest.Mocked<ILlmPort>;
  const testOrganizationId = createOrganizationId(uuidv4());

  beforeEach(() => {
    mockLogger = stubLogger();

    // Mock AIService instance
    mockAIService = {
      isConfigured: jest.fn(),
      executePrompt: jest.fn(),
      executePromptWithHistory: jest.fn(),
    } as unknown as jest.Mocked<AIService>;

    // Mock ILlmPort
    mockLlmPort = {
      getLlmForOrganization: jest
        .fn()
        .mockResolvedValue({ aiService: mockAIService }),
    } as jest.Mocked<ILlmPort>;

    commandSummaryService = new CommandSummaryService(mockLlmPort, mockLogger);
    // Default: AI service is configured unless specified otherwise
    mockAIService.isConfigured.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecipeSummary', () => {
    const mockCommandVersionData: Omit<CommandVersion, 'id'> =
      commandVersionFactory({
        name: 'Test Recipe',
        content: 'This is test recipe content',
      });

    describe('when AI service succeeds', () => {
      const mockSummary = 'Generated recipe summary';
      let result: string;

      beforeEach(async () => {
        const mockResult: AIPromptResult<string> = {
          success: true,
          data: mockSummary,
          attempts: 1,
          model: 'gpt-4o-mini',
        };

        mockAIService.executePrompt.mockResolvedValue(mockResult);

        result = await commandSummaryService.createCommandSummary(
          testOrganizationId,
          mockCommandVersionData,
        );
      });

      it('returns the generated summary', () => {
        expect(result).toBe(mockSummary);
      });

      it('calls executePrompt with the recipe content', () => {
        expect(mockAIService.executePrompt).toHaveBeenCalledWith(
          `${createCommandSummaryPrompt}\n\n${mockCommandVersionData.content}`,
        );
      });
    });

    describe('when AI service is not configured', () => {
      beforeEach(() => {
        mockAIService.isConfigured.mockResolvedValue(false);
      });

      it('throws AiNotConfigured error', async () => {
        await expect(
          commandSummaryService.createCommandSummary(
            testOrganizationId,
            mockCommandVersionData,
          ),
        ).rejects.toThrow(AiNotConfigured);
      });

      it('does not call executePrompt', async () => {
        try {
          await commandSummaryService.createCommandSummary(
            testOrganizationId,
            mockCommandVersionData,
          );
        } catch {
          // Expected to throw
        }

        expect(mockAIService.executePrompt).not.toHaveBeenCalled();
      });
    });

    describe('when AI service fails for other reasons', () => {
      it('throws error with failure message', async () => {
        const mockResult: AIPromptResult<string> = {
          success: false,
          data: null,
          error: 'Network error',
          attempts: 3,
          model: 'gpt-4o-mini',
        };

        mockAIService.executePrompt.mockResolvedValue(mockResult);

        await expect(
          commandSummaryService.createCommandSummary(
            testOrganizationId,
            mockCommandVersionData,
          ),
        ).rejects.toThrow('Failed to generate recipe summary: Network error');
      });
    });

    describe('when AI service throws an exception', () => {
      it('propagates the exception', async () => {
        const error = new Error('Connection timeout');
        mockAIService.executePrompt.mockRejectedValue(error);

        await expect(
          commandSummaryService.createCommandSummary(
            testOrganizationId,
            mockCommandVersionData,
          ),
        ).rejects.toThrow('Connection timeout');
      });
    });
  });
});
