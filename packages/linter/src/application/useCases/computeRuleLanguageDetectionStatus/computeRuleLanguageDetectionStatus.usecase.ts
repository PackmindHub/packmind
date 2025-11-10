import { PackmindLogger } from '@packmind/logger';
import { DetectionStatus, RuleLanguageDetectionStatus } from '@packmind/types';
import {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  IComputeRuleLanguageDetectionStatusUseCase,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'ComputeRuleLanguageDetectionStatusUseCase';

export class ComputeRuleLanguageDetectionStatusUseCase
  implements IComputeRuleLanguageDetectionStatusUseCase
{
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse> {
    this.logger.info('Computing rule language detection status', {
      ruleId: command.ruleId,
      language: command.language,
    });

    try {
      // Fetch ActiveDetectionProgram with relations (includes both programs)
      const activeDetectionPrograms = await this.repositories
        .getActiveDetectionProgramRepository()
        .findByRuleIdWithPrograms(command.ruleId);

      const activeDetectionProgram = activeDetectionPrograms.find(
        (program) => program.language === command.language,
      );

      // If active program status is READY → OK
      if (
        activeDetectionProgram?.detectionProgram?.status ===
        DetectionStatus.READY
      ) {
        this.logger.info(
          'Active detection program is ready, returning OK status',
          {
            ruleId: command.ruleId,
            language: command.language,
          },
        );
        return { status: RuleLanguageDetectionStatus.OK };
      }

      const hasDraft =
        activeDetectionProgram !== undefined &&
        activeDetectionProgram.draftDetectionProgram !== null;
      const hasActive =
        activeDetectionProgram !== undefined &&
        activeDetectionProgram.detectionProgram !== null;

      // If no programs exist, check assessment status (first 3 rows of truth table)
      if (!hasDraft && !hasActive) {
        const assessment = await this.repositories
          .getRuleDetectionAssessmentRepository()
          .get(command.ruleId, command.language);

        if (
          !assessment ||
          assessment.status === RuleDetectionAssessmentStatus.NOT_STARTED
        ) {
          this.logger.info(
            'No assessment or assessment not started, returning NONE status',
            {
              ruleId: command.ruleId,
              language: command.language,
              assessmentStatus: assessment?.status,
            },
          );
          return { status: RuleLanguageDetectionStatus.NONE };
        }

        if (assessment.status === RuleDetectionAssessmentStatus.FAILED) {
          this.logger.info('Assessment failed, returning NONE status', {
            ruleId: command.ruleId,
            language: command.language,
          });
          return { status: RuleLanguageDetectionStatus.NONE };
        }

        // Assessment SUCCESS → transitioning to program phase
        this.logger.info(
          'Assessment succeeded but no programs yet, returning WIP status',
          {
            ruleId: command.ruleId,
            language: command.language,
          },
        );
        return { status: RuleLanguageDetectionStatus.WIP };
      }

      // Has draft or active program but not READT → WIP
      this.logger.info('Programs exist but not ready, returning WIP status', {
        ruleId: command.ruleId,
        language: command.language,
        hasDraft,
        hasActive,
        activeStatus: activeDetectionProgram?.detectionProgram?.status,
        draftStatus: activeDetectionProgram?.draftDetectionProgram?.status,
      });
      return { status: RuleLanguageDetectionStatus.WIP };
    } catch (error) {
      this.logger.error('Failed to compute rule language detection status', {
        ruleId: command.ruleId,
        language: command.language,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
