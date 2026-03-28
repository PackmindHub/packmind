import { PackmindLogger } from '@packmind/logger';
import type {
  IMoveLinterArtefactsToNewRules,
  MoveLinterArtefactsToNewRulesCommand,
  MoveLinterArtefactsToNewRulesResponse,
  ILinterPort,
} from '@packmind/types';
import type { SoftDeleteLinterArtefactsByRuleUseCase } from '../softDeleteLinterArtefactsByRule/softDeleteLinterArtefactsByRule.usecase';

const origin = 'MoveLinterArtefactsToNewRulesUseCase';

export class MoveLinterArtefactsToNewRulesUseCase implements IMoveLinterArtefactsToNewRules {
  constructor(
    private readonly linterPort: ILinterPort,
    private readonly softDeleteLinterArtefactsByRuleUseCase: SoftDeleteLinterArtefactsByRuleUseCase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: MoveLinterArtefactsToNewRulesCommand,
  ): Promise<MoveLinterArtefactsToNewRulesResponse> {
    const { ruleMappings, organizationId, userId } = command;

    this.logger.info('Starting move of linter artefacts to new rules', {
      ruleMappingsCount: ruleMappings.length,
      organizationId,
      userId,
    });

    try {
      // Phase 1: Copy all artefacts from old rules to new rules
      let totalCopied = 0;
      await Promise.all(
        ruleMappings.map(async ({ oldRuleId, newRuleId }) => {
          const result = await this.linterPort.copyLinterArtefacts({
            oldRuleId,
            newRuleId,
            organizationId,
            userId,
          });
          totalCopied +=
            result.copiedProgramsCount +
            result.copiedAssessmentsCount +
            result.copiedHeuristicsCount +
            result.copiedMetadataCount;
        }),
      );

      // Phase 2: Soft-delete all old artefacts
      let softDeletedCount = 0;
      await Promise.all(
        ruleMappings.map(async ({ oldRuleId }) => {
          await this.softDeleteLinterArtefactsByRuleUseCase.execute({
            ruleId: oldRuleId,
          });
          softDeletedCount++;
        }),
      );

      this.logger.info('Successfully moved all linter artefacts to new rules', {
        totalCopied,
        softDeletedCount,
      });

      return { copiedCount: totalCopied, softDeletedCount };
    } catch (error) {
      this.logger.error('Failed to move linter artefacts to new rules', {
        ruleMappingsCount: ruleMappings.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
