import { PackmindLogger } from '@packmind/logger';
import {
  IGetDetectionHeuristics,
  GetDetectionHeuristicsCommand,
  GetDetectionHeuristicsResponse,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'GetDetectionHeuristicsUseCase';

export class GetDetectionHeuristicsUseCase implements IGetDetectionHeuristics {
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetDetectionHeuristicsCommand,
  ): Promise<GetDetectionHeuristicsResponse> {
    this.logger.info('Getting detection heuristics', {
      ruleId: command.ruleId,
      language: command.language,
    });

    const heuristicsRepo =
      this.linterRepositories.getRuleDetectionHeuristicsRepository();

    const detectionHeuristics = await heuristicsRepo.getHeuristicsForRule(
      command.ruleId,
      command.language,
    );

    if (!detectionHeuristics) {
      this.logger.info('Detection heuristics not found', {
        ruleId: command.ruleId,
        language: command.language,
      });
    } else {
      this.logger.info('Detection heuristics found', {
        ruleId: command.ruleId,
        language: command.language,
        detectionHeuristicsId: detectionHeuristics.id,
      });
    }

    return {
      detectionHeuristics,
    };
  }
}
