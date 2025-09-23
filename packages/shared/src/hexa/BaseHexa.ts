import { PackmindLogger } from '../logger/PackmindLogger';

/**
 * Forward declaration to avoid circular dependency
 */
interface AppRegistry {
  get<T extends BaseHexa>(constructor: new (registry: AppRegistry) => T): T;
}

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

export abstract class BaseHexa<T extends BaseHexaOpts = BaseHexaOpts> {
  protected readonly logger: PackmindLogger;

  /**
   * Create the app with access to the app registry.
   * Dependencies can be resolved immediately in the constructor, eliminating
   * the need for nullable properties.
   *
   * @param registry - The app registry instance for accessing other apps
   * @param opts - the options to create the Hexa
   */
  constructor(
    protected readonly registry: AppRegistry,
    protected readonly opts?: Partial<T>,
  ) {
    this.logger = opts?.logger ?? new PackmindLogger('BaseHexa');
  }

  /**
   * Clean up resources when the app is being destroyed.
   * This method should handle any cleanup logic like closing connections,
   * clearing caches, etc.
   */
  abstract destroy(): void;
}
