import { Cache } from '@packmind/node-utils';
import {
  RuleId,
  DetectionHeuristics,
  ProgrammingLanguage,
  DetectionHeuristicsId,
} from '@packmind/types';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { IRuleDetectionHeuristicsRepository } from '../../domain/repositories/IRuleDetectionHeuristicsRepository';

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

  private getCacheKey(ruleId: RuleId, language: ProgrammingLanguage): string {
    return `${RuleDetectionHeuristicsCacheRepository.CACHE_PREFIX}${ruleId}:${language}`;
  }

  private getCacheKeyById(id: DetectionHeuristicsId): string {
    return `${RuleDetectionHeuristicsCacheRepository.CACHE_PREFIX}id:${id}`;
  }

  async upsertHeuristics(heuristic: DetectionHeuristics): Promise<void> {
    this.logger.info('Upserting detection heuristics', {
      ruleId: heuristic.ruleId,
      language: heuristic.language,
    });

    // Store by both ruleId+language and by id
    const cacheKeyByRule = this.getCacheKey(
      heuristic.ruleId,
      heuristic.language,
    );
    const cacheKeyById = this.getCacheKeyById(heuristic.id);

    await Promise.all([
      this.cache.set(
        cacheKeyByRule,
        heuristic,
        RuleDetectionHeuristicsCacheRepository.CACHE_EXPIRATION_SECONDS,
      ),
      this.cache.set(
        cacheKeyById,
        heuristic,
        RuleDetectionHeuristicsCacheRepository.CACHE_EXPIRATION_SECONDS,
      ),
    ]);
  }

  async getHeuristicsForRule(
    ruleId: RuleId,
    language: ProgrammingLanguage,
  ): Promise<DetectionHeuristics | null> {
    const cacheKey = this.getCacheKey(ruleId, language);
    const heuristics = await this.cache.get<DetectionHeuristics>(cacheKey);

    if (!heuristics) {
      this.logger.info('Detection heuristics not found in cache', {
        ruleId,
        language,
      });
      return null;
    }

    return heuristics;
  }

  async updateHeuristics(
    id: DetectionHeuristicsId,
    heuristics: string,
  ): Promise<void> {
    this.logger.info('Updating detection heuristics', { id });

    // Retrieve existing heuristics
    const existing = await this.getHeuristicsById(id);
    if (!existing) {
      throw new Error(`Detection heuristics with id ${id} not found`);
    }

    // Update only the heuristics property
    const updated: DetectionHeuristics = {
      ...existing,
      heuristics,
    };

    // Save updated heuristics
    await this.upsertHeuristics(updated);
  }

  async getHeuristicsById(
    id: DetectionHeuristicsId,
  ): Promise<DetectionHeuristics | null> {
    const cacheKey = this.getCacheKeyById(id);
    const heuristics = await this.cache.get<DetectionHeuristics>(cacheKey);

    if (!heuristics) {
      this.logger.info('Detection heuristics not found in cache by id', { id });
      return null;
    }

    return heuristics;
  }

  async getAllHeuristicsForRule(
    ruleId: RuleId,
  ): Promise<DetectionHeuristics[]> {
    this.logger.info('Getting all detection heuristics for rule', { ruleId });

    const allHeuristics: DetectionHeuristics[] = [];
    const languageValues = Object.values(ProgrammingLanguage);

    for (const language of languageValues) {
      const heuristics = await this.getHeuristicsForRule(ruleId, language);
      if (heuristics) {
        allHeuristics.push(heuristics);
      }
    }

    this.logger.info('Retrieved detection heuristics for rule', {
      ruleId,
      count: allHeuristics.length,
    });

    return allHeuristics;
  }
}
