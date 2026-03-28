import { PackmindLogger } from '@packmind/logger';
import type {
  ISoftDeleteLinterArtefactsByRule,
  SoftDeleteLinterArtefactsByRuleCommand,
  SoftDeleteLinterArtefactsByRuleResponse,
} from '@packmind/types';
import type { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'SoftDeleteLinterArtefactsByRuleUseCase';

export class SoftDeleteLinterArtefactsByRuleUseCase implements ISoftDeleteLinterArtefactsByRule {
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: SoftDeleteLinterArtefactsByRuleCommand,
  ): Promise<SoftDeleteLinterArtefactsByRuleResponse> {
    const { ruleId } = command;

    this.logger.info('Starting soft-delete of linter artefacts for rule', {
      ruleId,
    });

    try {
      // Fetch program IDs before soft-deleting, as metadata is linked by detectionProgramId
      const programs = await this.repositories
        .getDetectionProgramRepository()
        .findByRuleId(ruleId);
      const programIds = programs.map((p) => p.id);

      await Promise.all([
        this.repositories
          .getDetectionProgramRepository()
          .softDeleteByRuleId(ruleId),
        this.repositories
          .getActiveDetectionProgramRepository()
          .deleteByRuleId(ruleId),
        this.repositories
          .getRuleDetectionAssessmentRepository()
          .softDeleteByRuleId(ruleId),
        this.repositories
          .getRuleDetectionHeuristicsRepository()
          .softDeleteByRuleId(ruleId),
        this.repositories
          .getDetectionProgramMetadataRepository()
          .softDeleteByDetectionProgramIds(programIds),
      ]);

      this.logger.info(
        'Successfully soft-deleted all linter artefacts for rule',
        { ruleId },
      );
    } catch (error) {
      this.logger.error('Failed to soft-delete linter artefacts for rule', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
