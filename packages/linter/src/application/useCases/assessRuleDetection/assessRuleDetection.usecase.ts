import { PackmindLogger } from '@packmind/logger';
import {
  IStandardsPort,
  ILinterPort,
  ILlmPort,
  AiNotConfigured,
  OrganizationId,
  createOrganizationId,
} from '@packmind/types';
import {
  AssessRuleDetectionOutput,
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
  DetectionProgramRuleInput,
  AssessRuleDetectionJobCommand,
  IAssessRuleDetectionJob,
  DetectionHeuristics,
  RuleId,
  ProgrammingLanguage,
  AssessmentDetectionReadiness,
  RuleExample,
} from '@packmind/types';
import { RuleDetectionAssessmentService } from './RuleDetectionAssessmentService';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'AssessRuleDetectionUseCase';

export class AssessRuleDetectionUseCase implements IAssessRuleDetectionJob {
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly llmPort: ILlmPort | null,
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

      const filteredExamples = await this.fetchAndFilterRuleExamples(
        command.rule.id,
        command.language,
        command.jobId,
      );

      // Check if there is at least one negative example
      const hasNegativeExample = this.hasNonEmptyNegativeExample(
        filteredExamples,
        command.jobId,
      );

      if (!hasNegativeExample) {
        this.logger.info(
          'No negative examples found for language, skipping assessment',
          {
            jobId: command.jobId,
            ruleId: command.rule.id,
            language: command.language,
          },
        );

        // Save assessment as FAILED with appropriate message
        const assessment =
          await this.saveFailedAssessmentNoNegativeExamples(command);

        return {
          assessmentId: command.assessmentId,
          status: assessment.status,
          feasible: false,
          details: assessment.details,
        };
      }

      const detectionProgramRuleInput = this.buildDetectionProgramRuleInput(
        command,
        filteredExamples,
      );

      const existingHeuristics = await this.getExistingHeuristics(
        command.rule.id,
        command.language,
      );

      const assessmentResult = await this.runFeasibilityAssessment(
        detectionProgramRuleInput,
        existingHeuristics,
        createOrganizationId(command.organizationId),
        command.jobId,
      );

      const assessment = await this.saveAssessment(command, assessmentResult);

      await this.ensureHeuristicsExist(command, existingHeuristics);

      const output = this.buildOutput(command, assessment, assessmentResult);

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

  private async fetchAndFilterRuleExamples(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    jobId: string,
  ) {
    const allRuleExamples =
      await this.standardsAdapter.getRuleCodeExamples(ruleId);

    const filteredExamples = allRuleExamples.filter(
      (example) => example.lang === language,
    );

    this.logger.info('Rule examples filtered for language', {
      jobId,
      language,
      totalExamples: allRuleExamples.length,
      filteredExamples: filteredExamples.length,
    });

    return filteredExamples;
  }

  private hasNonEmptyNegativeExample(
    examples: RuleExample[],
    jobId: string,
  ): boolean {
    const hasNegative = examples.some(
      (example) => example.negative && example.negative.trim() !== '',
    );

    this.logger.info('Checked for negative examples', {
      jobId,
      examplesCount: examples.length,
      hasNegativeExample: hasNegative,
    });

    return hasNegative;
  }

  private async saveFailedAssessmentNoNegativeExamples(
    command: AssessRuleDetectionJobCommand,
  ): Promise<RuleDetectionAssessment> {
    const assessment: RuleDetectionAssessment = {
      id: command.assessmentId,
      ruleId: command.rule.id,
      language: command.language,
      detectionMode: DetectionModeEnum.SINGLE_AST,
      status: RuleDetectionAssessmentStatus.FAILED,
      details:
        '- No negative code examples found for this language. Add at least one "Don\'t" example to enable detection assessment.',
      clarificationQuestion: null,
      clarificationAnswers: null,
    };

    await this.linterRepositories
      .getRuleDetectionAssessmentRepository()
      .add(assessment);

    this.logger.info(
      'Assessment saved as FAILED due to missing negative examples',
      {
        jobId: command.jobId,
        assessmentId: assessment.id,
        ruleId: command.rule.id,
        language: command.language,
      },
    );

    return assessment;
  }

  private buildDetectionProgramRuleInput(
    command: AssessRuleDetectionJobCommand,
    filteredExamples: RuleExample[],
  ): DetectionProgramRuleInput {
    return {
      rule: command.rule,
      ruleExamples: filteredExamples,
      language: command.language,
    };
  }

  private async getExistingHeuristics(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<DetectionHeuristics | null> {
    const heuristicsRepo =
      this.linterRepositories.getRuleDetectionHeuristicsRepository();

    return await heuristicsRepo.getHeuristicsForRule(ruleId, language);
  }

  private async runFeasibilityAssessment(
    detectionProgramRuleInput: DetectionProgramRuleInput,
    existingHeuristics: DetectionHeuristics | null,
    organizationId: OrganizationId,
    jobId: string,
  ) {
    if (!this.llmPort) {
      throw new AiNotConfigured(
        'LLM port not configured for rule detection assessment',
      );
    }
    const response = await this.llmPort.getLlmForOrganization({
      organizationId,
    });
    if (!response.aiService) {
      this.logger.warn(
        'AI service not configured for organization - cannot assess rule detection',
        {
          organizationId: organizationId.toString(),
          jobId,
        },
      );
      throw new AiNotConfigured(
        'AI service not configured for this organization',
      );
    }
    const aiService = response.aiService;
    const assessmentService = new RuleDetectionAssessmentService(
      aiService,
      this.logger,
    );

    const assessmentResult = await assessmentService.runFeasibilityAssessment(
      detectionProgramRuleInput,
      existingHeuristics,
    );

    this.logger.info('Feasibility assessment completed', {
      jobId,
      feasible: assessmentResult.feasible,
      reasonsCount: assessmentResult.reason.length,
    });

    return assessmentResult;
  }

  private async saveAssessment(
    command: AssessRuleDetectionJobCommand,
    assessmentResult: AssessmentDetectionReadiness,
  ): Promise<RuleDetectionAssessment> {
    const status = assessmentResult.feasible
      ? RuleDetectionAssessmentStatus.SUCCESS
      : RuleDetectionAssessmentStatus.FAILED;

    const details = assessmentResult.reason
      .map((reason: string) => `- ${reason}`)
      .join('\n');

    const assessment: RuleDetectionAssessment = {
      id: command.assessmentId,
      ruleId: command.rule.id,
      language: command.language,
      detectionMode: DetectionModeEnum.SINGLE_AST,
      status,
      details,
      clarificationQuestion:
        assessmentResult.clarificationQuestion?.question ?? null,
      clarificationAnswers:
        assessmentResult.clarificationQuestion?.answers ?? null,
    };

    await this.linterRepositories
      .getRuleDetectionAssessmentRepository()
      .add(assessment);

    this.logger.info('Assessment updated in repository', {
      jobId: command.jobId,
      assessmentId: assessment.id,
      status: assessment.status,
      hasClarificationQuestion: !!assessmentResult.clarificationQuestion,
    });

    return assessment;
  }

  private async ensureHeuristicsExist(
    command: AssessRuleDetectionJobCommand,
    existingHeuristics: DetectionHeuristics | null,
  ): Promise<void> {
    if (existingHeuristics) {
      return;
    }

    this.logger.info('Creating new detection heuristics', {
      jobId: command.jobId,
      ruleId: command.rule.id,
      language: command.language,
    });

    const linterAdapter = this.getLinterAdapter();
    await linterAdapter.createDetectionHeuristics({
      userId: command.userId,
      organizationId: command.organizationId,
      ruleId: command.rule.id,
      language: command.language,
    });

    this.logger.info('Detection heuristics created', {
      jobId: command.jobId,
      ruleId: command.rule.id,
      language: command.language,
    });
  }

  private buildOutput(
    command: AssessRuleDetectionJobCommand,
    assessment: RuleDetectionAssessment,
    assessmentResult: AssessmentDetectionReadiness,
  ): AssessRuleDetectionOutput {
    return {
      assessmentId: command.assessmentId,
      status: assessment.status,
      feasible: assessmentResult.feasible,
      details: assessment.details,
    };
  }
}
