import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';
import type { HexaRegistry } from './HexaRegistry';

/**
 * Base options for all services.
 */
export type BaseServiceOpts = { logger: PackmindLogger };

/**
 * Base class for all infrastructure services.
 *
 * Services are infrastructure components that don't follow the hexagonal port-adapter pattern
 * but still need lifecycle management and access to the registry. Examples include:
 * - JobsService for background job management
 * - CacheService for distributed caching
 * - EventBusService for event-driven communication
 *
 * Unlike BaseHexa, services:
 * - Do NOT implement the port-adapter pattern
 * - Do NOT expose cross-domain contracts via ports
 * - Are purely internal infrastructure
 *
 * Services follow the same lifecycle as hexas:
 * 1. Construction with DataSource
 * 2. Registration in HexaRegistry
 * 3. Initialization with registry access
 * 4. Cleanup on destroy
 */
export abstract class BaseService<T extends BaseServiceOpts = BaseServiceOpts> {
  /**
   * Create the service with DataSource for database operations.
   *
   * @param dataSource - The TypeORM DataSource for database operations
   * @param opts - The options to create the service
   * @param logger - The logger instance
   */
  constructor(
    protected readonly dataSource: DataSource,
    protected readonly opts?: Partial<T>,
    protected readonly logger: PackmindLogger = opts?.logger ??
      new PackmindLogger('BaseService'),
  ) {}

  /**
   * Initialize the service with access to the registry.
   * This method is called after all hexas and services are constructed,
   * allowing safe access to other hexas' adapters and services.
   *
   * @param registry - The hexa registry instance for accessing hexas and services
   */
  abstract initialize(registry: HexaRegistry): Promise<void>;

  /**
   * Clean up resources when the service is being destroyed.
   * This method should handle any cleanup logic like closing connections,
   * clearing caches, shutting down job queues, etc.
   */
  abstract destroy(): void;
}
