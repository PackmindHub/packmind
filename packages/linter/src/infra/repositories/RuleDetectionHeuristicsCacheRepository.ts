import { Cache } from '@packmind/node-utils';
import { RuleId } from '@packmind/types';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { IRuleDetectionHeuristicsRepository } from '../../domain/repositories/IRuleDetectionHeuristicsRepository';
import { DetectionHeuristics } from '../../domain/entities/DetectionHeuristics';

const origin = 'RuleDetectionHeuristicsRepository';

export class RuleDetectionHeuristicsCacheRepository
  implements IRuleDetectionHeuristicsRepository
{
  private readonly cache: Cache;
  private readonly logger: PackmindLogger;
  private static readonly CACHE_PREFIX = 'rule_detection_heuristics:';
  private static readonly CACHE_EXPIRATION_SECONDS = 3600 * 24 * 7; // 1 week

  constructor() {
    this.cache = Cache.getInstance();
    this.logger = new PackmindLogger(origin, LogLevel.INFO);
  }

  private getCacheKey(ruleId: RuleId): string {
    return `${RuleDetectionHeuristicsCacheRepository.CACHE_PREFIX}${ruleId}`;
  }

  async upsertHeuristics(heuristic: DetectionHeuristics): Promise<void> {
    this.logger.info('Upserting detection heuristics', {
      ruleId: heuristic.ruleId,
    });

    const cacheKey = this.getCacheKey(heuristic.ruleId);
    await this.cache.set(
      cacheKey,
      heuristic,
      RuleDetectionHeuristicsCacheRepository.CACHE_EXPIRATION_SECONDS,
    );
  }

  async getHeuristicsForRule(
    ruleId: RuleId,
  ): Promise<DetectionHeuristics | null> {
    const cacheKey = this.getCacheKey(ruleId);
    const heuristics = await this.cache.get<DetectionHeuristics>(cacheKey);

    if (!heuristics) {
      this.logger.info('Detection heuristics not found in cache', {
        ruleId,
      });
      return null;
    }

    return heuristics;
  }
}
