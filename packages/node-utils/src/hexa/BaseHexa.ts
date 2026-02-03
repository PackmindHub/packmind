import { PackmindLogger } from '@packmind/logger';
import { DataSource } from 'typeorm';
import type { HexaRegistry } from './HexaRegistry';

/**
 * Base class for all domain applications.
 *
 * This class serves as the foundation for domain-specific App classes that act as
 * facades for their respective use cases. Each domain app should extend this class
 * and implement the required lifecycle methods.
 *
 * The App classes hold the Hexa instance and serve as a clean facade for use cases,
 * while the Hexa classes focus on dependency injection and service instantiation.
 */

export type BaseHexaOpts = { logger: PackmindLogger };

export abstract class BaseHexa<
  T extends BaseHexaOpts = BaseHexaOpts,
  TPort = void,
> {
  /**
   * Create the hexa with DataSource for database operations.
   * Factories should be created in the constructor using the DataSource.
   * Adapter retrieval from registry should be done in initialize(registry).
   *
   * @param dataSource - The TypeORM DataSource for database operations
   * @param opts - the options to create the Hexa
   * @param logger - The logger instance
   */
  constructor(
    protected readonly dataSource: DataSource,
    protected readonly opts?: Partial<T>,
    protected readonly logger: PackmindLogger = opts?.logger ??
      new PackmindLogger('BaseHexa'),
  ) {}

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   * This method is called after all hexas are constructed, allowing safe
   * access to other hexas' adapters. It also handles any async initialization
   * (e.g., setting up job queues, external connections, etc.).
   *
   * @param registry - The hexa registry instance for accessing other hexas
   */
  abstract initialize(registry: HexaRegistry): Promise<void>;

  /**
   * Get the adapter for cross-domain access.
   * Each hexa that exposes an adapter must implement this method.
   *
   * @returns The port adapter instance
   */
  abstract getAdapter(): TPort;

  /**
   * Get the port name for this hexa.
   * Hexas that expose adapters should return the port name constant from @packmind/types.
   * Hexas that don't expose adapters should throw an error indicating no port is exposed.
   *
   * @returns The port name (e.g., 'IGitPort', 'IDeploymentPort')
   * @throws Error if the hexa doesn't expose a port
   */
  abstract getPortName(): string;

  /**
   * Clean up resources when the app is being destroyed.
   * This method should handle any cleanup logic like closing connections,
   * clearing caches, etc.
   */
  abstract destroy(): void;
}
