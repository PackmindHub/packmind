import { PackmindLogger } from '@packmind/logger';
import { OpenAIService } from '@packmind/node-utils';
import { IStandardsPort } from '@packmind/types';
import {
  AssessRuleDetectionOutput,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
  DetectionProgramRuleInput,
  AssessRuleDetectionJobCommand,
  IAssessRuleDetectionJob,
} from '@packmind/types';
import { RuleDetectionAssessmentService } from './RuleDetectionAssessmentService';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'AssessRuleDetectionUseCase';

export class AssessRuleDetectionUseCase implements IAssessRuleDetectionJob {
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: AssessRuleDetectionJobCommand,
  ): Promise<AssessRuleDetectionOutput> {
    try {
      this.logger.info('Job starting - running feasibility assessment', {
        jobId: command.jobId,
        assessmentId: command.assessmentId,
        language: command.language,
      });

      // Fetch rule examples and filter by the target language
      const allRuleExamples = await this.standardsAdapter.getRuleCodeExamples(
        command.rule.id,
      );

      const filteredExamples = allRuleExamples.filter(
        (example) => example.lang === command.language,
      );

      this.logger.info('Rule examples filtered for language', {
        jobId: command.jobId,
        language: command.language,
        totalExamples: allRuleExamples.length,
        filteredExamples: filteredExamples.length,
      });

      // Build detection program rule input
      const detectionProgramRuleInput: DetectionProgramRuleInput = {
        rule: command.rule,
        ruleExamples: filteredExamples,
        language: command.language,
      };

      // Run feasibility assessment
      const aiService = new OpenAIService();
      const assessmentService = new RuleDetectionAssessmentService(
        aiService,
        this.logger,
      );

      const assessmentResult = await assessmentService.runFeasibilityAssessment(
        detectionProgramRuleInput,
      );

      this.logger.info('Feasibility assessment completed', {
        jobId: command.jobId,
        feasible: assessmentResult.feasible,
        reasonsCount: assessmentResult.reason.length,
      });

      // Map to RuleDetectionAssessment entity
      const status = assessmentResult.feasible
        ? RuleDetectionAssessmentStatus.SUCCESS
        : RuleDetectionAssessmentStatus.FAILED;

      const details = assessmentResult.reason
        .map((reason) => `- ${reason}`)
        .join('\n');

      // Update assessment in repository
      const assessment: RuleDetectionAssessment = {
        id: command.assessmentId,
        ruleId: command.rule.id,
        language: command.language,
        detectionMode: DetectionModeEnum.SINGLE_AST,
        status,
        details,
      };

      await this.linterRepositories
        .getRuleDetectionAssessmentRepository()
        .add(assessment);

      this.logger.info('Assessment updated in repository', {
        jobId: command.jobId,
        assessmentId: assessment.id,
        status: assessment.status,
      });

      // Return output
      const output: AssessRuleDetectionOutput = {
        assessmentId: command.assessmentId,
        status,
        feasible: assessmentResult.feasible,
        details,
      };

      this.logger.info('Job completed', {
        jobId: command.jobId,
        assessmentId: output.assessmentId,
        status: output.status,
      });

      return output;
    } catch (error) {
      this.logger.error('Failed to assess rule detection', {
        jobId: command.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
