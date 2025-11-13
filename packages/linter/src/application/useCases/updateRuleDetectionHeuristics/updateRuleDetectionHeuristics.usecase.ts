import { PackmindLogger } from '@packmind/logger';
import {
  IUpdateRuleDetectionHeuristics,
  UpdateRuleDetectionHeuristicsCommand,
  UpdateRuleDetectionHeuristicsResponse,
  IStandardsPort,
  ILinterPort,
  RuleId,
  ProgrammingLanguage,
  OrganizationId,
  UserId,
  createUserId,
  createOrganizationId,
  UpdateHeuristicsFollowingChatbotInputCommand,
  IAccountsPort,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { SSEEventPublisher } from '@packmind/node-utils';
import { GenerateHeuristicFollowingChatbotInputUsecase } from '../generateHeuristicFollowingChatbotInput/generateHeuristicFollowingChatbotInput.usecase';

const origin = 'UpdateRuleDetectionHeuristicsUseCase';

export class UpdateRuleDetectionHeuristicsUseCase
  implements IUpdateRuleDetectionHeuristics
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly accountsPort: IAccountsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse> {
    this.logger.info('Updating rule detection heuristics', {
      detectionHeuristicsId: command.detectionHeuristicsId,
    });

    const heuristicsRepo =
      this.linterRepositories.getRuleDetectionHeuristicsRepository();

    // Retrieve existing heuristics
    const existingHeuristics = await heuristicsRepo.getHeuristicsById(
      command.detectionHeuristicsId,
    );

    if (!existingHeuristics) {
      const errorMessage = `Detection heuristics with id ${command.detectionHeuristicsId} not found`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Check if clarification question is provided with valid values
    if (
      command.clarificationQuestion &&
      command.clarificationQuestion.question?.trim() &&
      command.clarificationQuestion.answer?.trim()
    ) {
      const { question, answer } = command.clarificationQuestion;

      this.logger.info('Processing clarification question', {
        detectionHeuristicsId: command.detectionHeuristicsId,
      });

      // Call updateHeuristicsFollowingChatbotInput to generate new heuristic
      const chatbotUseCase = new GenerateHeuristicFollowingChatbotInputUsecase(
        this.accountsPort,
        this.linterRepositories,
        this.standardsAdapter,
        this.logger,
      );

      const chatbotCommand: UpdateHeuristicsFollowingChatbotInputCommand = {
        detectionHeuristicsId: command.detectionHeuristicsId,
        question,
        answer,
        userId: command.userId,
        organizationId: command.organizationId,
      };

      const chatbotResponse = await chatbotUseCase.execute(chatbotCommand);

      // Append the new heuristic to the command's heuristics array if not empty
      if (chatbotResponse.newHeuristic?.trim()) {
        command.heuristics = [
          ...command.heuristics,
          chatbotResponse.newHeuristic,
        ];
        this.logger.info('New heuristic generated and appended', {
          detectionHeuristicsId: command.detectionHeuristicsId,
          newHeuristic: chatbotResponse.newHeuristic,
        });
      }
    }

    // Update heuristics
    await heuristicsRepo.updateHeuristics(
      command.detectionHeuristicsId,
      command.heuristics,
    );

    // Retrieve updated heuristics
    const updatedHeuristics = await heuristicsRepo.getHeuristicsById(
      command.detectionHeuristicsId,
    );

    if (!updatedHeuristics) {
      throw new Error('Failed to retrieve updated heuristics');
    }

    this.logger.info('Rule detection heuristics updated successfully', {
      detectionHeuristicsId: command.detectionHeuristicsId,
    });

    // Publish SSE event after successful update
    try {
      await SSEEventPublisher.publishDetectionHeuristicsUpdatedEvent(
        existingHeuristics.ruleId,
        existingHeuristics.language,
        command.detectionHeuristicsId,
        command.userId,
        command.organizationId,
      );
      this.logger.info('SSE event published for heuristics update', {
        detectionHeuristicsId: command.detectionHeuristicsId,
        ruleId: existingHeuristics.ruleId,
        language: existingHeuristics.language,
      });
    } catch (sseError) {
      this.logger.error('Failed to publish SSE event for heuristics update', {
        detectionHeuristicsId: command.detectionHeuristicsId,
        error: sseError instanceof Error ? sseError.message : String(sseError),
      });
      // Don't throw here - the main operation was successful
    }

    // Trigger rule detection assessment after heuristics update
    await this.triggerRuleDetectionAssessment(
      existingHeuristics.ruleId,
      existingHeuristics.language,
      createOrganizationId(command.organizationId),
      createUserId(command.userId),
    );

    return {
      detectionHeuristics: updatedHeuristics,
    };
  }

  private async triggerRuleDetectionAssessment(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<void> {
    try {
      this.logger.info('Triggering rule detection assessment', {
        ruleId,
        language,
        organizationId,
        userId,
      });

      // Fetch the full rule
      const rule = await this.standardsAdapter.getRule(ruleId);
      if (!rule) {
        this.logger.error('Rule not found for assessment', { ruleId });
        return;
      }

      // Start the assessment
      await this.getLinterAdapter().startRuleDetectionAssessment({
        rule,
        organizationId,
        userId,
        language,
      });

      this.logger.info('Rule detection assessment triggered successfully', {
        ruleId,
        language,
      });
    } catch (error) {
      // Log error but don't throw - heuristics update should still succeed
      this.logger.error('Failed to trigger rule detection assessment', {
        ruleId,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
