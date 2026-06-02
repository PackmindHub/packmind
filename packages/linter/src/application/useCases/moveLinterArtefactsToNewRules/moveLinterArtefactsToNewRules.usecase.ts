import { PackmindLogger } from '@packmind/logger';
import type {
  IMoveLinterArtefactsToNewRules,
  MoveLinterArtefactsToNewRulesCommand,
  MoveLinterArtefactsToNewRulesResponse,
  ILinterPort,
} from '@packmind/types';
import type { SoftDeleteLinterArtefactsByRuleUseCase } from '../softDeleteLinterArtefactsByRule/softDeleteLinterArtefactsByRule.usecase';

const origin = 'MoveLinterArtefactsToNewRulesUseCase';

// This use case is invoked from MoveLinterArtefactsDelayedJob (BullMQ background job),
// where authentication/authorization was already verified before dispatch.
// It does not extend AbstractMemberUseCase because member validation is unnecessary here.
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
      const copyResults = await Promise.all(
        ruleMappings.map(({ oldRuleId, newRuleId }) =>
          this.linterPort.copyLinterArtefacts({
            oldRuleId,
            newRuleId,
            organizationId,
            userId,
          }),
        ),
      );
      const totalCopied = copyResults.reduce(
        (sum, r) =>
          sum +
          r.copiedProgramsCount +
          r.copiedAssessmentsCount +
          r.copiedHeuristicsCount +
          r.copiedMetadataCount,
        0,
      );

      // Phase 2: Soft-delete all old artefacts
      await Promise.all(
        ruleMappings.map(({ oldRuleId }) =>
          this.softDeleteLinterArtefactsByRuleUseCase.execute({
            ruleId: oldRuleId,
            userId,
            organizationId,
          }),
        ),
      );

      this.logger.info('Successfully moved all linter artefacts to new rules', {
        totalCopied,
        softDeletedCount: ruleMappings.length,
      });

      return {
        copiedCount: totalCopied,
        softDeletedCount: ruleMappings.length,
      };
    } catch (error) {
      this.logger.error('Failed to move linter artefacts to new rules', {
        ruleMappingsCount: ruleMappings.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
