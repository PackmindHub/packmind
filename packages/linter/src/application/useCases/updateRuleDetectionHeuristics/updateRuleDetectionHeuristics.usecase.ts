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
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'UpdateRuleDetectionHeuristicsUseCase';

export class UpdateRuleDetectionHeuristicsUseCase
  implements IUpdateRuleDetectionHeuristics
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
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
