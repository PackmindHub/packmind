import { PackmindLogger } from '@packmind/logger';
import {
  ICopyLinterArtefacts,
  CopyLinterArtefactsCommand,
  CopyLinterArtefactsResponse,
  ILinterPort,
} from '@packmind/types';

const origin = 'CopyLinterArtefactsUseCase';

export class CopyLinterArtefactsUseCase implements ICopyLinterArtefacts {
  constructor(
    private readonly linterPort: ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CopyLinterArtefactsCommand,
  ): Promise<CopyLinterArtefactsResponse> {
    this.logger.info('Starting to copy all linter artefacts to new rule', {
      oldRuleId: command.oldRuleId,
      newRuleId: command.newRuleId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const [heuristicsResult, assessmentsResult, programsResult] =
        await Promise.all([
          this.linterPort.copyDetectionHeuristics(command),
          this.linterPort.copyRuleDetectionAssessments(command),
          this.linterPort.copyDetectionProgramsToNewRule(command),
        ]);

      const response = {
        copiedHeuristicsCount: heuristicsResult.copiedHeuristicsCount,
        copiedAssessmentsCount: assessmentsResult.copiedAssessmentsCount,
        copiedProgramsCount: programsResult.copiedProgramsCount,
      };

      this.logger.info('Successfully copied all linter artefacts', {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        ...response,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to copy linter artefacts', {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
