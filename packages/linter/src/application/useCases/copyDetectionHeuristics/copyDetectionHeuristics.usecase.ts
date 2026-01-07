import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  ICopyDetectionHeuristics,
  CopyDetectionHeuristicsCommand,
  CopyDetectionHeuristicsResponse,
  DetectionHeuristics,
  createDetectionHeuristicsId,
} from '@packmind/types';

const origin = 'CopyDetectionHeuristicsUseCase';

export class CopyDetectionHeuristicsUseCase
  implements ICopyDetectionHeuristics
{
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CopyDetectionHeuristicsCommand,
  ): Promise<CopyDetectionHeuristicsResponse> {
    this.logger.info('Starting to copy detection heuristics to new rule', {
      oldRuleId: command.oldRuleId,
      newRuleId: command.newRuleId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const oldHeuristics = await this.repositories
        .getRuleDetectionHeuristicsRepository()
        .getAllHeuristicsForRule(command.oldRuleId);

      if (oldHeuristics.length === 0) {
        this.logger.info('No detection heuristics found for old rule', {
          oldRuleId: command.oldRuleId,
        });
        return { copiedHeuristicsCount: 0 };
      }

      this.logger.info('Found detection heuristics to copy', {
        count: oldHeuristics.length,
        oldRuleId: command.oldRuleId,
      });

      for (const oldHeuristic of oldHeuristics) {
        const newHeuristic: DetectionHeuristics = {
          ...oldHeuristic,
          id: createDetectionHeuristicsId(uuidv4()),
          ruleId: command.newRuleId,
        };

        await this.repositories
          .getRuleDetectionHeuristicsRepository()
          .upsertHeuristics(newHeuristic);
      }

      this.logger.info(
        'Successfully copied all detection heuristics to new rule',
        {
          oldRuleId: command.oldRuleId,
          newRuleId: command.newRuleId,
          copiedHeuristicsCount: oldHeuristics.length,
        },
      );

      return { copiedHeuristicsCount: oldHeuristics.length };
    } catch (error) {
      this.logger.error('Failed to copy detection heuristics', {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
