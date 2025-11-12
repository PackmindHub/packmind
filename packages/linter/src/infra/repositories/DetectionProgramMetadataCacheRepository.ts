import { Cache } from '@packmind/node-utils';
import { PackmindLogger, LogLevel } from '@packmind/logger';
import { IDetectionProgramMetadataRepository } from '../../domain/repositories/IDetectionProgramMetadataRepository';
import {
  DetectionProgramMetadata,
  ExecutionLog,
  DetectionProgramId,
  TokensUsed,
} from '@packmind/types';

const origin = 'DetectionProgramMetadataRepository';

export class DetectionProgramMetadataCacheRepository
  implements IDetectionProgramMetadataRepository
{
  private readonly cache: Cache;
  private readonly logger: PackmindLogger;
  private static readonly CACHE_PREFIX = 'detection_program_metadata:';
  private static readonly CACHE_EXPIRATION_SECONDS = 3600 * 24 * 7; // 1 week

  constructor() {
    this.cache = Cache.getInstance();
    this.logger = new PackmindLogger(origin, LogLevel.INFO);
  }

  private getCacheKey(detectionProgramId: DetectionProgramId): string {
    return `${DetectionProgramMetadataCacheRepository.CACHE_PREFIX}${detectionProgramId}`;
  }

  async add(
    entity: DetectionProgramMetadata,
  ): Promise<DetectionProgramMetadata> {
    this.logger.info('Adding detection program metadata', {
      detectionProgramId: entity.detectionProgramId,
    });

    const cacheKey = this.getCacheKey(entity.detectionProgramId);
    await this.cache.set(
      cacheKey,
      entity,
      DetectionProgramMetadataCacheRepository.CACHE_EXPIRATION_SECONDS,
    );

    return entity;
  }

  async findById(
    id: DetectionProgramId,
  ): Promise<DetectionProgramMetadata | null> {
    const cacheKey = this.getCacheKey(id);
    const metadata = await this.cache.get<DetectionProgramMetadata>(cacheKey);

    if (!metadata) {
      this.logger.info('Detection program metadata not found in cache', {
        detectionProgramId: id,
      });
      return null;
    }

    return metadata;
  }

  async findByDetectionProgramId(
    detectionProgramId: DetectionProgramId,
  ): Promise<DetectionProgramMetadata | null> {
    return this.findById(detectionProgramId);
  }

  async deleteById(entityId: DetectionProgramId): Promise<void> {
    this.logger.info('Deleting detection program metadata', {
      detectionProgramId: entityId,
    });

    const cacheKey = this.getCacheKey(entityId);
    await this.cache.invalidate(cacheKey);
  }

  async restoreById(entityId: DetectionProgramId): Promise<void> {
    this.logger.info(
      'Restore operation not supported for cache-based repository',
      {
        detectionProgramId: entityId,
      },
    );
    // Restore operation doesn't make sense for cache-based storage
    // This is a no-op
  }

  async addLog(
    log: ExecutionLog,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info('Adding log to detection program metadata', {
      detectionProgramId,
    });

    const cacheKey = this.getCacheKey(detectionProgramId);
    let metadata = await this.cache.get<DetectionProgramMetadata>(cacheKey);

    if (!metadata) {
      this.logger.info(
        'Detection program metadata not found, creating new entry',
        {
          detectionProgramId,
        },
      );

      metadata = {
        id: detectionProgramId,
        detectionProgramId,
        taskId: '',
        tokens: null,
        logs: [],
        programDescription: '',
        detectionHeuristics: '',
      };
    }

    const updatedMetadata: DetectionProgramMetadata = {
      ...metadata,
      logs: metadata.logs ? [...metadata.logs, log] : [log],
    };

    await this.cache.set(
      cacheKey,
      updatedMetadata,
      DetectionProgramMetadataCacheRepository.CACHE_EXPIRATION_SECONDS,
    );
  }

  async updateProgramDescription(
    programDescription: string,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info(
      'Updating program description in detection program metadata',
      {
        detectionProgramId,
      },
    );

    const cacheKey = this.getCacheKey(detectionProgramId);
    let metadata = await this.cache.get<DetectionProgramMetadata>(cacheKey);

    if (!metadata) {
      this.logger.info(
        'Detection program metadata not found, creating new entry',
        {
          detectionProgramId,
        },
      );

      metadata = {
        id: detectionProgramId,
        detectionProgramId,
        taskId: '',
        tokens: null,
        logs: [],
        programDescription: '',
        detectionHeuristics: '',
      };
    }

    const updatedMetadata: DetectionProgramMetadata = {
      ...metadata,
      programDescription,
    };

    await this.cache.set(
      cacheKey,
      updatedMetadata,
      DetectionProgramMetadataCacheRepository.CACHE_EXPIRATION_SECONDS,
    );
  }

  async updateTokensUsed(
    tokens: TokensUsed,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info('Updating tokens used in detection program metadata', {
      detectionProgramId,
    });

    const cacheKey = this.getCacheKey(detectionProgramId);
    let metadata = await this.cache.get<DetectionProgramMetadata>(cacheKey);

    if (!metadata) {
      this.logger.info(
        'Detection program metadata not found, creating new entry',
        {
          detectionProgramId,
        },
      );

      metadata = {
        id: detectionProgramId,
        detectionProgramId,
        taskId: '',
        tokens: null,
        logs: [],
        programDescription: '',
        detectionHeuristics: '',
      };
    }

    const updatedMetadata: DetectionProgramMetadata = {
      ...metadata,
      tokens,
    };

    await this.cache.set(
      cacheKey,
      updatedMetadata,
      DetectionProgramMetadataCacheRepository.CACHE_EXPIRATION_SECONDS,
    );
  }

  async updateDetectionHeuristics(
    detectionHeuristics: string,
    detectionProgramId: DetectionProgramId,
  ): Promise<void> {
    this.logger.info(
      'Updating detection heuristics in detection program metadata',
      {
        detectionProgramId,
      },
    );

    const cacheKey = this.getCacheKey(detectionProgramId);
    let metadata = await this.cache.get<DetectionProgramMetadata>(cacheKey);

    if (!metadata) {
      this.logger.info(
        'Detection program metadata not found, creating new entry',
        {
          detectionProgramId,
        },
      );

      metadata = {
        id: detectionProgramId,
        detectionProgramId,
        taskId: '',
        tokens: null,
        logs: [],
        programDescription: '',
        detectionHeuristics: '',
      };
    }

    const updatedMetadata: DetectionProgramMetadata = {
      ...metadata,
      detectionHeuristics,
    };

    await this.cache.set(
      cacheKey,
      updatedMetadata,
      DetectionProgramMetadataCacheRepository.CACHE_EXPIRATION_SECONDS,
    );
  }
}
