import { PackmindLogger } from '@packmind/logger';
import {
  ICreateDetectionHeuristics,
  CreateDetectionHeuristicsCommand,
  CreateDetectionHeuristicsResponse,
  createDetectionHeuristicsId,
  DetectionHeuristics,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import { v4 as uuidv4 } from 'uuid';

const origin = 'CreateDetectionHeuristicsUseCase';

export class CreateDetectionHeuristicsUseCase
  implements ICreateDetectionHeuristics
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CreateDetectionHeuristicsCommand,
  ): Promise<CreateDetectionHeuristicsResponse> {
    this.logger.info('Creating detection heuristics', {
      ruleId: command.ruleId,
      language: command.language,
    });

    const heuristicsRepo =
      this.linterRepositories.getRuleDetectionHeuristicsRepository();

    // Check if heuristics already exist
    const existingHeuristics = await heuristicsRepo.getHeuristicsForRule(
      command.ruleId,
      command.language,
    );

    if (existingHeuristics) {
      this.logger.info(
        'Detection heuristics already exist, returning existing',
        {
          ruleId: command.ruleId,
          language: command.language,
          detectionHeuristicsId: existingHeuristics.id,
        },
      );

      return {
        detectionHeuristics: existingHeuristics,
      };
    }

    // Create new heuristics
    const newHeuristics: DetectionHeuristics = {
      id: createDetectionHeuristicsId(uuidv4()),
      ruleId: command.ruleId,
      language: command.language,
      heuristics: command.heuristics || [],
    };

    await heuristicsRepo.upsertHeuristics(newHeuristics);

    this.logger.info('Detection heuristics created successfully', {
      ruleId: command.ruleId,
      language: command.language,
      detectionHeuristicsId: newHeuristics.id,
    });

    return {
      detectionHeuristics: newHeuristics,
    };
  }
}
