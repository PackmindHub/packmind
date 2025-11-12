import { PackmindLogger } from '@packmind/logger';
import {
  IUpdateRuleDetectionHeuristics,
  UpdateRuleDetectionHeuristicsCommand,
  UpdateRuleDetectionHeuristicsResponse,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'UpdateRuleDetectionHeuristicsUseCase';

export class UpdateRuleDetectionHeuristicsUseCase
  implements IUpdateRuleDetectionHeuristics
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
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

    return {
      detectionHeuristics: updatedHeuristics,
    };
  }
}
