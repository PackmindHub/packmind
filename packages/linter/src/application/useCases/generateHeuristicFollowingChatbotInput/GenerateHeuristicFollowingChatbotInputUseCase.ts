import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  UpdateHeuristicsFollowingChatbotInputCommand,
  UpdateHeuristicsFollowingChatbotInputResponse,
  IStandardsPort,
  IAccountsPort,
  ILlmPort,
  AiNotConfigured,
  createOrganizationId,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { HeuristicGenerationService } from './shared/HeuristicGenerationService';

const origin = 'GenerateHeuristicFollowingChatbotInputUseCase';

export class GenerateHeuristicFollowingChatbotInputUseCase extends AbstractMemberUseCase<
  UpdateHeuristicsFollowingChatbotInputCommand,
  UpdateHeuristicsFollowingChatbotInputResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly llmPort: ILlmPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: UpdateHeuristicsFollowingChatbotInputCommand & MemberContext,
  ): Promise<UpdateHeuristicsFollowingChatbotInputResponse> {
    this.logger.info('Updating heuristics from chatbot input', {
      detectionHeuristicsId: command.detectionHeuristicsId,
      userId: command.userId,
      organizationId: command.organizationId,
    });

    try {
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

      // Get rule details
      const rule = await this.standardsAdapter.getRule(
        existingHeuristics.ruleId,
      );
      if (!rule) {
        const errorMessage = `Rule with id ${existingHeuristics.ruleId} not found`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Get rule examples and filter by language
      const allRuleExamples = await this.standardsAdapter.getRuleCodeExamples(
        existingHeuristics.ruleId,
      );

      const filteredExamples = allRuleExamples.filter(
        (example) => example.lang === existingHeuristics.language,
      );

      this.logger.info('Rule examples filtered for language', {
        language: existingHeuristics.language,
        totalExamples: allRuleExamples.length,
        filteredExamples: filteredExamples.length,
      });

      // Generate new heuristic using AI
      if (!this.llmPort) {
        throw new AiNotConfigured(
          'LLM port not configured for heuristic generation',
        );
      }
      const response = await this.llmPort.getLlmForOrganization({
        organizationId: createOrganizationId(command.organizationId),
      });
      if (!response.aiService) {
        this.logger.warn(
          'AI service not configured for organization - cannot generate heuristic',
          {
            organizationId: command.organizationId,
          },
        );
        throw new AiNotConfigured(
          'AI service not configured for this organization',
        );
      }
      const aiService = response.aiService;
      const heuristicGenerationService = new HeuristicGenerationService(
        aiService,
      );

      const newHeuristic = await heuristicGenerationService.generateHeuristic(
        rule,
        filteredExamples,
        existingHeuristics.heuristics,
        command.question,
        command.answer,
      );

      this.logger.info('Generated new heuristic', {
        detectionHeuristicsId: command.detectionHeuristicsId,
        heuristic: newHeuristic,
      });

      return {
        newHeuristic,
      };
    } catch (error) {
      this.logger.error('Failed to update heuristics from chatbot input', {
        detectionHeuristicsId: command.detectionHeuristicsId,
        userId: command.userId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
